from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ReportBase(BaseModel):
    hazard_type: str
    description: Optional[str] = None
    severity: str = "medium"
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class ReportCreate(ReportBase):
    image_filenames: List[str] = Field(default_factory=list)


class MediaResponse(BaseModel):
    file_path: str
    file_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReportResponse(ReportBase):
    id: int
    user_id: int
    is_verified: bool = False
    status: str
    created_at: datetime
    media: List[MediaResponse] = Field(default_factory=list)
    ai_authenticity_score: Optional[float] = None
    ai_analysis_summary: Optional[str] = None
    ai_analysis_breakdown: Optional[str] = None
    reporter_name: Optional[str] = None
    confirmation_count: int = 0
    district: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)