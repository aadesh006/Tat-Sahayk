from functools import lru_cache
from typing import Callable

from app.core.config import settings
from app.services.ai.base import AIProviderError
from app.services.ai.bedrock_provider import BedrockProvider
from app.services.ai.local_provider import LocalMLProvider
from app.services.ai.models import AIAnalysisRequest, AIAnalysisResult


class AIService:
    """
    Coordinates local, Bedrock, hybrid, and fallback analysis modes.
    """

    def __init__(self):
        self.local_provider = LocalMLProvider()
        self.bedrock_provider = BedrockProvider()

    def analyze(self, request: AIAnalysisRequest) -> AIAnalysisResult:
        if settings.AI_PROVIDER == "local":
            return self._analyze_with_optional_fallback(
                request=request,
                primary_name="local",
                primary=self.local_provider.analyze,
                fallback_name="bedrock",
                fallback=self.bedrock_provider.analyze,
            )

        if settings.AI_PROVIDER == "bedrock":
            return self._analyze_with_optional_fallback(
                request=request,
                primary_name="bedrock",
                primary=self.bedrock_provider.analyze,
                fallback_name="local",
                fallback=self.local_provider.analyze,
            )

        if settings.AI_PROVIDER == "hybrid":
            return self._analyze_hybrid(request)

        raise AIProviderError(
            f"Unsupported AI provider: {settings.AI_PROVIDER}"
        )

    def _analyze_with_optional_fallback(
        self,
        request: AIAnalysisRequest,
        primary_name: str,
        primary: Callable[[AIAnalysisRequest], AIAnalysisResult],
        fallback_name: str,
        fallback: Callable[[AIAnalysisRequest], AIAnalysisResult],
    ) -> AIAnalysisResult:
        try:
            return primary(request)

        except AIProviderError as primary_error:
            if not settings.AI_FALLBACK_ENABLED:
                raise

            try:
                fallback_result = fallback(request)

            except AIProviderError as fallback_error:
                raise AIProviderError(
                    f"Primary provider '{primary_name}' failed: "
                    f"{primary_error}. Fallback provider "
                    f"'{fallback_name}' also failed: {fallback_error}"
                ) from fallback_error

            details = dict(fallback_result.details)
            details["fallback"] = {
                "used": True,
                "failed_provider": primary_name,
                "fallback_provider": fallback_name,
                "reason": str(primary_error),
            }

            return AIAnalysisResult(
                provider=f"{fallback_result.provider}-fallback",
                authenticity_score=fallback_result.authenticity_score,
                summary=(
                    f"{fallback_result.summary} "
                    f"Fallback used because '{primary_name}' was unavailable."
                ),
                recommended_status=fallback_result.recommended_status,
                details=details,
            )

    def _analyze_hybrid(
        self,
        request: AIAnalysisRequest,
    ) -> AIAnalysisResult:
        results: list[AIAnalysisResult] = []
        errors: dict[str, str] = {}

        try:
            results.append(self.local_provider.analyze(request))
        except AIProviderError as exc:
            errors["local"] = str(exc)

        try:
            results.append(self.bedrock_provider.analyze(request))
        except AIProviderError as exc:
            errors["bedrock"] = str(exc)

        if not results:
            raise AIProviderError(
                f"All hybrid providers failed: {errors}"
            )

        if len(results) == 1:
            available_result = results[0]

            return AIAnalysisResult(
                provider="hybrid-partial",
                authenticity_score=available_result.authenticity_score,
                summary=(
                    f"{available_result.summary} "
                    "Hybrid analysis completed with one available provider."
                ),
                recommended_status=available_result.recommended_status,
                details={
                    "provider_results": [
                        available_result.to_dict()
                    ],
                    "provider_errors": errors,
                },
            )

        local_result = next(
            result for result in results if result.provider == "local"
        )
        bedrock_result = next(
            result for result in results if result.provider == "bedrock"
        )

        # Bedrock has a slightly higher visual/contextual weight.
        combined_score = (
            local_result.authenticity_score * 0.45
            + bedrock_result.authenticity_score * 0.55
        )

        # Only recommend false when every successful provider agrees.
        recommended_status = (
            "false"
            if all(
                result.recommended_status == "false"
                for result in results
            )
            else "pending"
        )

        summary = (
            f"Hybrid score: {combined_score:.0%}. "
            f"Local ML: {local_result.authenticity_score:.0%}. "
            f"Bedrock: {bedrock_result.authenticity_score:.0%}. "
            "Administrator verification is required."
        )

        return AIAnalysisResult(
            provider="hybrid",
            authenticity_score=combined_score,
            summary=summary,
            recommended_status=recommended_status,
            details={
                "provider_results": [
                    result.to_dict() for result in results
                ],
                "provider_errors": errors,
                "weights": {
                    "local": 0.45,
                    "bedrock": 0.55,
                },
            },
        )


@lru_cache
def get_ai_service() -> AIService:
    return AIService()