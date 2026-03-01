from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from app.db.session import Base

class Report(Base):
    __tablename__ = "reports"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"))
    hazard_type  = Column(String,  nullable=False)
    description  = Column(Text)
    severity     = Column(String)
    location     = Column(Geometry("POINT", srid=4326))
    is_verified  = Column(Boolean, default=False)
    status       = Column(String,  default="pending")
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    # AI fields
    ai_authenticity_score = Column(Float,  nullable=True)
    ai_analysis_summary   = Column(String, nullable=True)

    owner    = relationship("User",    back_populates="reports")
    media    = relationship("Media",   back_populates="report")
    comments = relationship("Comment", back_populates="report", cascade="all, delete")

    @property
    def latitude(self):
        return to_shape(self.location).y if self.location else 0.0

    @property
    def longitude(self):
        return to_shape(self.location).x if self.location else 0.0