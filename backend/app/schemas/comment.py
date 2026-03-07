from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    report_id: int
    user_id: int
    content: str
    created_at: datetime
    author_name: Optional[str] = None
    author_profile_photo: Optional[str] = None

    class Config:
        from_attributes = True