from typing import Any

import httpx
from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine


router = APIRouter(tags=["system"])


def check_database() -> dict[str, Any]:
    """Verify that the backend can execute a database query."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "postgresql",
        }
    except Exception as exc:
        result: dict[str, Any] = {
            "status": "unhealthy",
            "database": "postgresql",
        }

        if settings.DEBUG:
            result["error"] = str(exc)

        return result


def check_ml_service() -> dict[str, Any]:
    """Verify the local ML service when the selected provider requires it."""
    if not settings.uses_local_ml:
        return {
            "status": "skipped",
            "reason": f"AI provider is '{settings.AI_PROVIDER}'",
        }

    health_url = (
        f"{settings.ML_SERVICE_URL.rstrip('/')}"
        f"{settings.ML_SERVICE_HEALTH_PATH}"
    )

    try:
        timeout = min(settings.ML_SERVICE_TIMEOUT_SECONDS, 5.0)

        with httpx.Client(timeout=timeout) as client:
            ml_response = client.get(health_url)
            ml_response.raise_for_status()
            ml_data = ml_response.json()

        service_status = ml_data.get("status", "unknown")
        healthy_statuses = {"healthy", "operational", "ready"}

        if service_status not in healthy_statuses:
            return {
                "status": "unhealthy",
                "url": health_url,
                "service_status": service_status,
            }

        return {
            "status": "healthy",
            "url": health_url,
            "service_status": service_status,
            "version": ml_data.get("version"),
        }

    except Exception as exc:
        result: dict[str, Any] = {
            "status": "unhealthy",
            "url": health_url,
        }

        if settings.DEBUG:
            result["error"] = str(exc)

        return result


@router.get("/health")
@router.get("/health/live")
def liveness_check():
    """
    Liveness only confirms that the backend process is running.

    It deliberately does not contact external dependencies.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/health/ready")
def readiness_check(response: Response):
    """
    Readiness confirms that required backend dependencies are available.
    """
    database_check = check_database()
    ml_check = check_ml_service()

    database_ready = database_check["status"] == "healthy"
    ml_ready = ml_check["status"] in {"healthy", "skipped"}
    ready = database_ready and ml_ready

    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if ready else "degraded",
        "service": settings.PROJECT_NAME,
        "ai_provider": settings.AI_PROVIDER,
        "checks": {
            "database": database_check,
            "ml_service": ml_check,
        },
    }