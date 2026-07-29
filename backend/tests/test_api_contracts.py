import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.report import ReportCreate
from app.schemas.user import UserSignup


def test_liveness_endpoint_starts_without_external_services():
    with TestClient(app) as client:
        response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_public_signup_rejects_admin_role():
    with pytest.raises(ValidationError):
        UserSignup(
            email="attacker@example.com",
            full_name="Role Escalation Attempt",
            password="prototype-password",
            role="admin",
        )


@pytest.mark.parametrize(
    ("latitude", "longitude"),
    [
        (91, 72.8),
        (-91, 72.8),
        (19.0, 181),
        (19.0, -181),
    ],
)
def test_report_rejects_invalid_coordinates(
    latitude,
    longitude,
):
    with pytest.raises(ValidationError):
        ReportCreate(
            hazard_type="cyclone",
            description="Invalid coordinate report.",
            latitude=latitude,
            longitude=longitude,
        )


def test_report_image_lists_are_not_shared():
    first = ReportCreate(
        hazard_type="cyclone",
        latitude=19.076,
        longitude=72.8777,
    )
    second = ReportCreate(
        hazard_type="tsunami",
        latitude=13.0827,
        longitude=80.2707,
    )

    first.image_filenames.append("evidence.jpg")

    assert second.image_filenames == []


def test_media_upload_requires_authentication():
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/media/upload",
            files={
                "file": (
                    "evidence.jpg",
                    b"prototype-image",
                    "image/jpeg",
                )
            },
        )

    assert response.status_code == 401
