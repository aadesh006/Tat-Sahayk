from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from datetime import datetime

class ReportBase(BaseModel):
    hazard_type: str
    description: Optional[str] = None
    severity: str = "medium"
    latitude: float
    longitude: float

# Schema for Creating a Report (Input)
class ReportCreate(ReportBase):
    pass

# Schema for Reading a Report (Output)
class ReportResponse(ReportBase):
    id: int
    user_id: int
    is_verified: bool
    status: str
    created_at: datetime
    
    # Custom config to handle GeoAlchemy2 objects
    model_config = ConfigDict(from_attributes=True)