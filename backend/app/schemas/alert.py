from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class AlertCreate(BaseModel):
    title:       str
    message:     str
    hazard_type: Optional[str] = None
    severity:    str = "medium"
    district:    Optional[str] = None
    state:       Optional[str] = None
    expires_at:  Optional[datetime] = None

class AlertResponse(BaseModel):
    id:          int
    admin_id:    int
    title:       str
    message:     str
    hazard_type: Optional[str]
    severity:    str
    district:    Optional[str]
    state:       Optional[str]
    is_active:   bool
    created_at:  datetime
    expires_at:  Optional[datetime]
    admin_name:  Optional[str] = None

    model_config = ConfigDict(from_attributes=True)