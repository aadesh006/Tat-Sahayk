from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.db.session import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Hazard Details
    hazard_type = Column(String, nullable=False)  # Tsunami, Storm Surge, High Waves
    description = Column(Text)
    severity = Column(String)  # Low, Medium, High, Critical
    
    # Location (PostGIS Geometry)
    # srid=4326 means standard GPS coordinates (Lat/Lon)
    location = Column(Geometry("POINT", srid=4326))
    
    # Verification Status
    is_verified = Column(Boolean, default=False)
    status = Column(String, default="pending")  # pending, verified, rejected
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", back_populates="reports")