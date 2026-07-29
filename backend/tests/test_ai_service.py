from dataclasses import dataclass
from typing import Union

import pytest

from app.core.config import settings
from app.services.ai.base import AIProviderError
from app.services.ai.models import (
    AIAnalysisRequest,
    AIAnalysisResult,
)
from app.services.ai.service import AIService


@dataclass
class StubProvider:
    outcome: Union[AIAnalysisResult, Exception]
    calls: int = 0

    def analyze(
        self,
        request: AIAnalysisRequest,
    ) -> AIAnalysisResult:
        self.calls += 1

        if isinstance(self.outcome, Exception):
            raise self.outcome

        return self.outcome


@pytest.fixture
def analysis_request() -> AIAnalysisRequest:
    return AIAnalysisRequest(
        report_id=1,
        description="Cyclone winds reported near the coastal road.",
        hazard_type="cyclone",
        latitude=19.076,
        longitude=72.8777,
        state="Maharashtra",
    )


def make_result(
    provider: str,
    score: float,
    recommended_status: str = "pending",
) -> AIAnalysisResult:
    return AIAnalysisResult(
        provider=provider,
        authenticity_score=score,
        summary=f"{provider} completed analysis.",
        recommended_status=recommended_status,
    )


def test_local_mode_uses_only_local_provider(
    monkeypatch,
    analysis_request,
):
    monkeypatch.setattr(settings, "AI_PROVIDER", "local")
    monkeypatch.setattr(settings, "AI_FALLBACK_ENABLED", False)

    service = AIService()
    service.local_provider = StubProvider(
        make_result("local", 0.72)
    )
    service.bedrock_provider = StubProvider(
        AssertionError("Bedrock should not be called")
    )

    result = service.analyze(analysis_request)

    assert result.provider == "local"
    assert result.authenticity_score == pytest.approx(0.72)
    assert service.local_provider.calls == 1
    assert service.bedrock_provider.calls == 0


def test_disabled_fallback_preserves_primary_error(
    monkeypatch,
    analysis_request,
):
    monkeypatch.setattr(settings, "AI_PROVIDER", "local")
    monkeypatch.setattr(settings, "AI_FALLBACK_ENABLED", False)

    service = AIService()
    service.local_provider = StubProvider(
        AIProviderError("local unavailable")
    )
    service.bedrock_provider = StubProvider(
        make_result("bedrock", 0.80)
    )

    with pytest.raises(
        AIProviderError,
        match="local unavailable",
    ):
        service.analyze(analysis_request)

    assert service.bedrock_provider.calls == 0


def test_enabled_fallback_records_provider_failure(
    monkeypatch,
    analysis_request,
):
    monkeypatch.setattr(settings, "AI_PROVIDER", "local")
    monkeypatch.setattr(settings, "AI_FALLBACK_ENABLED", True)

    service = AIService()
    service.local_provider = StubProvider(
        AIProviderError("local unavailable")
    )
    service.bedrock_provider = StubProvider(
        make_result("bedrock", 0.81)
    )

    result = service.analyze(analysis_request)

    assert result.provider == "bedrock-fallback"
    assert result.authenticity_score == pytest.approx(0.81)
    assert result.details["fallback"] == {
        "used": True,
        "failed_provider": "local",
        "fallback_provider": "bedrock",
        "reason": "local unavailable",
    }


def test_hybrid_mode_combines_both_provider_scores(
    monkeypatch,
    analysis_request,
):
    monkeypatch.setattr(settings, "AI_PROVIDER", "hybrid")

    service = AIService()
    service.local_provider = StubProvider(
        make_result("local", 0.64)
    )
    service.bedrock_provider = StubProvider(
        make_result("bedrock", 0.82)
    )

    result = service.analyze(analysis_request)

    expected_score = 0.64 * 0.45 + 0.82 * 0.55

    assert result.provider == "hybrid"
    assert result.authenticity_score == pytest.approx(
        expected_score
    )
    assert result.recommended_status == "pending"
    assert result.details["weights"] == {
        "local": 0.45,
        "bedrock": 0.55,
    }


def test_hybrid_mode_can_return_partial_result(
    monkeypatch,
    analysis_request,
):
    monkeypatch.setattr(settings, "AI_PROVIDER", "hybrid")

    service = AIService()
    service.local_provider = StubProvider(
        make_result("local", 0.70)
    )
    service.bedrock_provider = StubProvider(
        AIProviderError("AWS disabled")
    )

    result = service.analyze(analysis_request)

    assert result.provider == "hybrid-partial"
    assert result.authenticity_score == pytest.approx(0.70)
    assert result.details["provider_errors"] == {
        "bedrock": "AWS disabled"
    }


def test_hybrid_mode_fails_when_all_providers_fail(
    monkeypatch,
    analysis_request,
):
    monkeypatch.setattr(settings, "AI_PROVIDER", "hybrid")

    service = AIService()
    service.local_provider = StubProvider(
        AIProviderError("local unavailable")
    )
    service.bedrock_provider = StubProvider(
        AIProviderError("AWS unavailable")
    )

    with pytest.raises(
        AIProviderError,
        match="All hybrid providers failed",
    ):
        service.analyze(analysis_request)