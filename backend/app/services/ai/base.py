from abc import ABC, abstractmethod

from app.services.ai.models import AIAnalysisRequest, AIAnalysisResult


class AIProviderError(RuntimeError):
    """Raised when an AI provider cannot complete an analysis."""


class AIProvider(ABC):
    name: str

    @abstractmethod
    def analyze(self, request: AIAnalysisRequest) -> AIAnalysisResult:
        """Analyze one citizen hazard report."""
        raise NotImplementedError