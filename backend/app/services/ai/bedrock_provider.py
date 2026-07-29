from app.core.config import settings
from app.services.ai.base import AIProvider, AIProviderError
from app.services.ai.models import AIAnalysisRequest, AIAnalysisResult


class BedrockProvider(AIProvider):
    name = "bedrock"

    def analyze(self, request: AIAnalysisRequest) -> AIAnalysisResult:
        if not settings.AWS_ENABLED:
            raise AIProviderError(
                "AWS provider is disabled. Set AWS_ENABLED=true to use Bedrock."
            )

        try:
            # Import lazily so local-only startup never initializes AWS.
            from app.services.bedrock_ai import analyze_single_report

            raw_result = analyze_single_report(
                description=request.analysis_text,
                hazard_type=request.hazard_type,
                media_url=request.media_url,
                lat=request.latitude,
                lon=request.longitude,
                state=request.state,
            )

        except Exception as exc:
            raise AIProviderError(
                f"Bedrock analysis failed: {exc}"
            ) from exc

        try:
            score = float(raw_result.get("authenticity_score", 0.5))
        except (TypeError, ValueError):
            score = 0.5

        score = max(0.0, min(1.0, score))

        recommended_status = raw_result.get(
            "recommended_status",
            "pending",
        )

        if recommended_status not in {"pending", "verified", "false"}:
            recommended_status = "pending"

        summary = raw_result.get(
            "preliminary_summary",
            "Bedrock analysis completed.",
        )

        return AIAnalysisResult(
            provider=self.name,
            authenticity_score=score,
            summary=summary,
            recommended_status=recommended_status,
            details={
                "submitted_hazard_type": request.hazard_type,
                "bedrock_result": raw_result,
            },
        )