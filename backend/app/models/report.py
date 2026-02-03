from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from app.db.session import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Hazard Details
    hazard_type = Column(String, nullable=False)
    description = Column(Text)
    severity = Column(String)
    
    # Location (PostGIS Geometry)
    location = Column(Geometry("POINT", srid=4326))
    
    # Verification Status
    is_verified = Column(Boolean, default=False)
    status = Column(String, default="pending")
    
    # Meta
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="reports")
    media = relationship("Media", back_populates="report")

    #Virtual Properties
    @property
    def latitude(self):
        # Extracts the Y coordinate (Latitude) from the geometry
        # If location is missing for some reason, return 0.0
        if self.location is not None:
            return to_shape(self.location).y
        return 0.0

    @property
    def longitude(self):
        # Extracts the X coordinate (Longitude) from the geometry
        if self.location is not None:
            return to_shape(self.location).x
        return 0.0