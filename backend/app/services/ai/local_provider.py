from typing import Any

import httpx

from app.core.config import settings
from app.services.ai.base import AIProvider, AIProviderError
from app.services.ai.models import AIAnalysisRequest, AIAnalysisResult


HAZARD_ALIASES = {
    "flood": "coastal_flooding",
    "coastal_flood": "coastal_flooding",
    "coastal_flooding": "coastal_flooding",
    "high_wave": "high_waves",
    "high_waves": "high_waves",
    "storm_surge": "storm_surge",
    "coastal_erosion": "coastal_erosion",
    "cyclone": "cyclone",
    "hurricane": "cyclone",
    "typhoon": "cyclone",
    "tsunami": "tsunami",
}


def clamp_score(value: Any, default: float = 0.5) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return default


def normalize_hazard_type(value: str) -> str:
    normalized = (
        value.strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )

    return HAZARD_ALIASES.get(normalized, normalized)


def calculate_type_agreement(
    submitted_hazard: str,
    predicted_hazard: str,
    is_hazard: bool,
) -> float:
    if not is_hazard:
        return 0.0

    submitted = normalize_hazard_type(submitted_hazard)
    predicted = normalize_hazard_type(predicted_hazard)

    if submitted == predicted:
        return 1.0

    # Generic storm reports can reasonably map to several coastal hazards.
    if submitted == "storm" and predicted in {
        "cyclone",
        "storm_surge",
        "high_waves",
    }:
        return 0.75

    # The model still detected a hazard, but its classification differs.
    return 0.25


def get_sentiment_label(sentiment: Any) -> str:
    if isinstance(sentiment, str):
        return sentiment

    if isinstance(sentiment, dict):
        return str(
            sentiment.get("sentiment")
            or sentiment.get("label")
            or "unknown"
        )

    return "unknown"


class LocalMLProvider(AIProvider):
    name = "local"

    def analyze(self, request: AIAnalysisRequest) -> AIAnalysisResult:
        analyze_url = (
            f"{settings.ML_SERVICE_URL.rstrip('/')}"
            f"{settings.ML_SERVICE_ANALYZE_PATH}"
        )

        payload = {
            "text": request.analysis_text,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "has_media": bool(request.media_url),
            "media_count": request.media_count,
            "author_followers": request.author_followers,
            "timestamp": request.submitted_at.isoformat(),
        }

        try:
            with httpx.Client(
                timeout=settings.ML_SERVICE_TIMEOUT_SECONDS
            ) as client:
                response = client.post(analyze_url, json=payload)
                response.raise_for_status()
                data = response.json()

        except httpx.HTTPStatusError as exc:
            raise AIProviderError(
                "Local ML service rejected the analysis request with "
                f"HTTP {exc.response.status_code}"
            ) from exc

        except (httpx.RequestError, ValueError) as exc:
            raise AIProviderError(
                f"Local ML service is unavailable: {exc}"
            ) from exc

        hazard_detection = data.get("hazard_detection") or {}
        predicted_hazard = str(
            hazard_detection.get("hazard_type") or "unknown"
        )
        hazard_confidence = clamp_score(
            hazard_detection.get("confidence"),
            default=0.0,
        )
        metadata_credibility = clamp_score(
            data.get("credibility_score"),
            default=0.5,
        )
        is_hazard = bool(hazard_detection.get("is_hazard", False))
        sentiment_label = get_sentiment_label(data.get("sentiment"))

        hazard_evidence = (
            hazard_confidence
            if is_hazard
            else 1.0 - hazard_confidence
        )

        type_agreement = calculate_type_agreement(
            submitted_hazard=request.hazard_type,
            predicted_hazard=predicted_hazard,
            is_hazard=is_hazard,
        )

        # Overall local authenticity combines three independent signals.
        #
        # Hazard classification: 55%
        # Metadata credibility:   30%
        # Type agreement:         15%
        authenticity_score = (
            hazard_evidence * 0.55
            + metadata_credibility * 0.30
            + type_agreement * 0.15
        )
        authenticity_score = clamp_score(authenticity_score)

        recommended_status = "pending"

        # Recommendation only; the backend never automatically rejects it.
        if (
            not is_hazard
            and hazard_confidence >= 0.80
            and authenticity_score < 0.25
        ):
            recommended_status = "false"

        summary = (
            f"Local ML predicted '{predicted_hazard}' with "
            f"{hazard_confidence:.0%} confidence. "
            f"Overall local score: {authenticity_score:.0%}. "
            f"Metadata credibility: {metadata_credibility:.0%}. "
            f"Sentiment: {sentiment_label}."
        )

        return AIAnalysisResult(
            provider=self.name,
            authenticity_score=authenticity_score,
            summary=summary,
            recommended_status=recommended_status,
            details={
                "submitted_hazard_type": request.hazard_type,
                "predicted_hazard_type": predicted_hazard,
                "hazard_detection": hazard_detection,
                "sentiment": data.get("sentiment"),
                "entities": data.get("entities"),
                "ml_report_id": data.get("report_id"),
                "metadata": data.get("metadata"),
                "score_breakdown": {
                    "hazard_evidence": {
                        "score": round(hazard_evidence, 4),
                        "weight": 0.55,
                    },
                    "metadata_credibility": {
                        "score": round(metadata_credibility, 4),
                        "weight": 0.30,
                    },
                    "type_agreement": {
                        "score": round(type_agreement, 4),
                        "weight": 0.15,
                    },
                    "combined_score": round(
                        authenticity_score,
                        4,
                    ),
                },
            },
        )