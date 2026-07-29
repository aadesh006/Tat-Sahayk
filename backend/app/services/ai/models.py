from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal, Optional


RecommendedStatus = Literal["pending", "verified", "false"]


@dataclass(frozen=True)
class AIAnalysisRequest:
    report_id: int
    description: str
    hazard_type: str
    latitude: float
    longitude: float
    media_url: Optional[str] = None
    media_count: int = 0
    state: Optional[str] = None
    author_followers: int = 0
    submitted_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    @property
    def analysis_text(self) -> str:
        cleaned_description = self.description.strip()

        if cleaned_description:
            return cleaned_description

        return f"Citizen reported a {self.hazard_type} hazard."


@dataclass(frozen=True)
class AIAnalysisResult:
    provider: str
    authenticity_score: float
    summary: str
    recommended_status: RecommendedStatus = "pending"
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "authenticity_score": round(
                max(0.0, min(1.0, self.authenticity_score)),
                4,
            ),
            "summary": self.summary,
            "recommended_status": self.recommended_status,
            "details": self.details,
        }