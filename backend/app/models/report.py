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
    
    # Confirmation/Like feature
    confirmation_count = Column(Integer, default=0)

    # AI fields
    ai_authenticity_score = Column(Float,  nullable=True)
    ai_analysis_summary   = Column(String, nullable=True)
    ai_analysis_breakdown = Column(Text,   nullable=True)  # JSON string with detailed scores
    
    # Location metadata
    district = Column(String, nullable=True)  # Auto-filled via reverse geocoding

    owner    = relationship("User",    back_populates="reports")
    media    = relationship("Media",   back_populates="report")
    comments = relationship("Comment", back_populates="report", cascade="all, delete")
    confirmations = relationship("ReportConfirmation", back_populates="report", cascade="all, delete-orphan", lazy="dynamic")
    rescue_deployments = relationship("RescueDeployment", back_populates="report", cascade="all, delete")

    @property
    def latitude(self):
        if not self.location:
            return None
        return to_shape(self.location).y

    @property
    def longitude(self):
        if not self.location:
            return None
        return to_shape(self.location).x