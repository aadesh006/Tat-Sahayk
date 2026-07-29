import pytest

from app.core.config import settings
from app.services.ai.local_provider import LocalMLProvider
from app.services.ai.models import AIAnalysisRequest


class FakeResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return {
            "report_id": "RPT_test",
            "hazard_detection": {
                "is_hazard": True,
                "hazard_type": "cyclone",
                "confidence": 0.80,
            },
            "sentiment": {
                "sentiment": "negative",
            },
            "entities": {},
            "credibility_score": 0.65,
            "metadata": {
                "credibility_profile": "citizen",
            },
        }


def test_local_provider_normalizes_ml_response(
    monkeypatch,
):
    captured = {}

    class FakeClient:
        def __init__(self, timeout):
            captured["timeout"] = timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def post(self, url, json):
            captured["url"] = url
            captured["payload"] = json
            return FakeResponse()

    monkeypatch.setattr(
        "app.services.ai.local_provider.httpx.Client",
        FakeClient,
    )
    monkeypatch.setattr(
        settings,
        "ML_SERVICE_URL",
        "http://ml-service:8000",
    )
    monkeypatch.setattr(
        settings,
        "ML_SERVICE_ANALYZE_PATH",
        "/api/v1/analyze/report",
    )
    monkeypatch.setattr(
        settings,
        "ML_SERVICE_TIMEOUT_SECONDS",
        30.0,
    )

    request = AIAnalysisRequest(
        report_id=7,
        description="Cyclone winds reported near the coast.",
        hazard_type="cyclone",
        latitude=19.076,
        longitude=72.8777,
    )

    result = LocalMLProvider().analyze(request)

    assert captured["url"] == (
        "http://ml-service:8000/api/v1/analyze/report"
    )
    assert captured["payload"]["text"] == request.description
    assert captured["payload"]["latitude"] == request.latitude
    assert captured["payload"]["longitude"] == request.longitude

    # 0.80 * 0.55 + 0.65 * 0.30 + 1.00 * 0.15
    assert result.authenticity_score == pytest.approx(0.785)
    assert result.provider == "local"
    assert result.recommended_status == "pending"
    assert result.details["score_breakdown"][
        "combined_score"
    ] == pytest.approx(0.785)