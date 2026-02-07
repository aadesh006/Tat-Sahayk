from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.social import SocialPost

router = APIRouter()

@router.get("/")
def get_social_feed(db: Session = Depends(get_db)):

    return db.query(SocialPost).order_by(SocialPost.published_at.desc()).limit(20).all()