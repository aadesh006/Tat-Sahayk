from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

# Base Schema
class ReportBase(BaseModel):
    hazard_type: str
    description: Optional[str] = None
    severity: str = "medium"
    latitude: float
    longitude: float

# Schema for Creating a Report (Input)
class ReportCreate(ReportBase):
    image_filenames: Optional[List[str]] = [] 

# Schema for Media Response
class MediaResponse(BaseModel):
    file_path: str
    file_type: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Schema for Reading a Report (Output)
class ReportResponse(ReportBase):
    id: int
    user_id: int
    is_verified: bool
    status: str
    created_at: datetime
    
    # Return the full media objects
    media: List[MediaResponse] = [] 

    model_config = ConfigDict(from_attributes=True)