from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from typing import Optional

class ReportBase(BaseModel):
    hazard_type:  str
    description:  Optional[str] = None
    severity:     str = "medium"
    latitude:     float
    longitude:    float

class ReportCreate(ReportBase):
    image_filenames: Optional[List[str]] = []

class MediaResponse(BaseModel):
    file_path:  str
    file_type:  Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ReportResponse(ReportBase):
    id:                    int
    user_id:               int
    is_verified:           Optional[bool] = False
    status:                str
    created_at:            datetime
    media:                 List[MediaResponse] = []
    ai_authenticity_score: Optional[float] = None
    ai_analysis_summary:   Optional[str]  = None

    model_config = ConfigDict(from_attributes=True)