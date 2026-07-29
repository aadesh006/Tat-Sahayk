import json
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Iterable

import httpx


PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


API_URL = os.getenv(
    "BACKEND_TEST_API_URL",
    "http://localhost:5001/api/v1",
).rstrip("/")

EXPECTED_AI_PROVIDER = os.getenv(
    "EXPECTED_AI_PROVIDER",
    "local",
).strip().lower()

REQUEST_TIMEOUT_SECONDS = 60.0
ANALYSIS_TIMEOUT_SECONDS = 30.0
POLL_INTERVAL_SECONDS = 0.5


def require_status(
    response: httpx.Response,
    expected: Iterable[int],
) -> httpx.Response:
    expected_statuses = set(expected)

    if response.status_code not in expected_statuses:
        raise RuntimeError(
            f"{response.request.method} {response.request.url} returned "
            f"HTTP {response.status_code}: {response.text}"
        )

    return response


def decode_breakdown(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value

    if isinstance(value, str) and value.strip():
        decoded = json.loads(value)

        if isinstance(decoded, dict):
            return decoded

    raise AssertionError("Report AI analysis breakdown is missing or invalid")


def main() -> None:
    run_id = uuid.uuid4().hex[:12]
    blocked_email = f"e2e-admin-{run_id}@example.com"
    citizen_email = f"e2e-citizen-{run_id}@example.com"
    password = f"Prototype-{run_id}!"

    token = None
    report_id = None
    cleanup_messages: list[str] = []

    with httpx.Client(
        base_url=API_URL,
        timeout=REQUEST_TIMEOUT_SECONDS,
        follow_redirects=True,
        trust_env=False,
    ) as client:
        try:
            # Security contract: public clients must not select an admin role.
            blocked_signup = client.post(
                "/auth/signup",
                json={
                    "email": blocked_email,
                    "full_name": "Blocked Admin Attempt",
                    "password": password,
                    "role": "admin",
                },
            )

            require_status(blocked_signup, {422})

            signup = client.post(
                "/auth/signup",
                json={
                    "email": citizen_email,
                    "full_name": "Prototype Workflow Test",
                    "password": password,
                },
            )
            require_status(signup, {200})

            signup_user = signup.json()

            if signup_user.get("role") != "citizen":
                raise AssertionError(
                    "Public signup did not create a citizen account"
                )

            login = client.post(
                "/auth/login",
                data={
                    "username": citizen_email,
                    "password": password,
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            require_status(login, {200})

            token = login.json()["access_token"]
            client.headers["Authorization"] = f"Bearer {token}"

            me = client.get("/auth/me")
            require_status(me, {200})

            if me.json().get("role") != "citizen":
                raise AssertionError(
                    "Authenticated test account is not a citizen"
                )

            create_report = client.post(
                "/reports/",
                json={
                    "hazard_type": "cyclone",
                    "description": (
                        "Strong cyclone winds and storm surge are crossing "
                        "the coastal road near Mumbai. Residents are moving "
                        "to safer buildings tonight at 8 pm."
                    ),
                    "severity": "high",
                    "latitude": 19.0760,
                    "longitude": 72.8777,
                    "image_filenames": [],
                },
            )
            require_status(create_report, {200})

            created = create_report.json()
            report_id = created["id"]

            if created.get("status") != "pending":
                raise AssertionError(
                    "A newly submitted report must remain pending"
                )

            deadline = time.monotonic() + ANALYSIS_TIMEOUT_SECONDS
            stored_report = None

            while time.monotonic() < deadline:
                response = client.get(f"/reports/{report_id}")
                require_status(response, {200})
                stored_report = response.json()

                if stored_report.get("ai_authenticity_score") is not None:
                    break

                time.sleep(POLL_INTERVAL_SECONDS)

            if not stored_report:
                raise AssertionError("Stored report could not be retrieved")

            score = stored_report.get("ai_authenticity_score")

            if score is None:
                raise AssertionError(
                    "Local ML analysis did not finish before the timeout"
                )

            if not 0.0 <= float(score) <= 1.0:
                raise AssertionError(
                    f"AI authenticity score is out of range: {score}"
                )

            if not stored_report.get("ai_analysis_summary"):
                raise AssertionError("AI analysis summary was not persisted")

            breakdown = decode_breakdown(
                stored_report.get("ai_analysis_breakdown")
            )

            provider = str(
                breakdown.get("provider", "")
            ).strip().lower()

            if provider != EXPECTED_AI_PROVIDER:
                raise AssertionError(
                    f"Expected provider '{EXPECTED_AI_PROVIDER}', "
                    f"received '{provider or 'missing'}'"
                )

            if breakdown.get("recommended_status") != "pending":
                raise AssertionError(
                    "Local AI must leave the final report decision pending"
                )

            if stored_report.get("status") != "pending":
                raise AssertionError(
                    "AI analysis changed the report status automatically"
                )

            print(
                json.dumps(
                    {
                        "result": "passed",
                        "security": {
                            "public_admin_signup_blocked": True,
                            "citizen_authenticated": True,
                        },
                        "report": {
                            "id": report_id,
                            "persisted": True,
                            "status": stored_report["status"],
                            "hazard_type": stored_report["hazard_type"],
                        },
                        "ai_analysis": {
                            "provider": provider,
                            "authenticity_score": score,
                            "summary": stored_report[
                                "ai_analysis_summary"
                            ],
                            "recommended_status": breakdown[
                                "recommended_status"
                            ],
                        },
                    },
                    indent=2,
                )
            )

        finally:
            if token and report_id:
                response = client.delete(f"/reports/{report_id}")

                if response.status_code == 204:
                    cleanup_messages.append(
                        f"deleted temporary report {report_id}"
                    )
                else:
                    cleanup_messages.append(
                        "temporary report cleanup failed: "
                        f"HTTP {response.status_code}"
                    )

            if token:
                response = client.delete("/auth/me")

                if response.status_code == 200:
                    cleanup_messages.append(
                        "deleted temporary citizen account"
                    )
                else:
                    cleanup_messages.append(
                        "temporary account cleanup failed: "
                        f"HTTP {response.status_code}"
                    )

            if cleanup_messages:
                print(
                    json.dumps(
                        {"cleanup": cleanup_messages},
                        indent=2,
                    )
                )


if __name__ == "__main__":
    main()