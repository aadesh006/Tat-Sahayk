from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ARRAY
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.db.session import Base

class HazardZone(Base):
    """
    Multi-hazard red zones unsuitable for permanent habitation.
    Dynamically identified and updated based on disaster patterns.
    """
    __tablename__ = "hazard_zones"

    id = Column(Integer, primary_key=True, index=True)
    
    # Zone identification
    name = Column(String, nullable=False)  # e.g., "Kedarnath Landslide Zone A"
    zone_code = Column(String, unique=True, nullable=False, index=True)  # e.g., "RZ-UK-2024-001"
    
    # Geographic data
    boundary = Column(Geometry("POLYGON", srid=4326), nullable=False)  # Zone boundary
    area_sqkm = Column(Float)  # Calculated area in square kilometers
    
    # Hazard classification
    zone_type = Column(String, default="red")  # red, yellow, green
    risk_level = Column(String, nullable=False)  # critical, high, medium, low
    hazard_types = Column(ARRAY(String))  # ["landslide", "flood", "erosion", "cloudburst"]
    
    # Population impact
    population_estimate = Column(Integer, default=0)
    households_estimate = Column(Integer, default=0)
    
    # Historical context
    historical_incidents_count = Column(Integer, default=0)
    last_incident_date = Column(DateTime(timezone=True))
    
    # Administrative
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    
    # Status
    status = Column(String, default="active")  # active, inactive, under_review
    is_official = Column(Boolean, default=False)  # Officially designated by authorities
    
    # AI/Analysis metadata
    ai_confidence_score = Column(Float)  # 0.0 to 1.0 - confidence in zone designation
    identified_by = Column(String, default="manual")  # manual, ai_suggestion, historical_data
    
    # Documentation
    description = Column(Text)
    mitigation_measures = Column(Text)  # Actions taken or recommended
    
    # Audit trail
    created_by_id = Column(Integer)  # Admin user who created
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<HazardZone {self.zone_code}: {self.name}>"
