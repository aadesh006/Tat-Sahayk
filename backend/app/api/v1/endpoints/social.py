from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.models.social import SocialPost

router = APIRouter()

class SocialPostResponse(BaseModel):
    id: int
    source: Optional[str] = None
    author: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[SocialPostResponse])
def get_social_feed(
    source: Optional[str] = Query(None, description="Filter by source"),
    limit: int = Query(20, ge=1, le=50, description="Number of posts to return"),
    db: Session = Depends(get_db)
):
    query = db.query(SocialPost)
    if source:
        query = query.filter(SocialPost.source == source)
        
    posts = query.order_by(SocialPost.published_at.desc()).limit(limit).all()
    return posts or []