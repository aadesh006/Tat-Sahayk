from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.db.session import Base

class SocialPost(Base):
    __tablename__ = "social_posts"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String)
    author = Column(String)
    content = Column(Text)
    url = Column(String)     # Link to the original post
    published_at = Column(DateTime(timezone=True), server_default=func.now())