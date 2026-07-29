from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None  # For threaded replies

class CommentResponse(BaseModel):
    id: int
    report_id: int
    user_id: int
    parent_id: Optional[int] = None
    content: str
    created_at: datetime
    author_name: Optional[str] = None
    author_profile_photo: Optional[str] = None
    author_role: Optional[str] = None  # For showing admin badge

    class Config:
        from_attributes = True