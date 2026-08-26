from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from app.db.session import Base

class RelocationSite(Base):
    """
    Safe relocation sites with carrying capacity assessment.
    Suitable areas for permanent resettlement of vulnerable populations.
    """
    __tablename__ = "relocation_sites"

    id = Column(Integer, primary_key=True, index=True)
    
    # Site identification
    name = Column(String, nullable=False)  # e.g., "New Kedarnath Settlement"
    site_code = Column(String, unique=True, nullable=False, index=True)
    
    # Location
    location = Column(Geometry("POINT", srid=4326), nullable=False)  # Center point
    boundary = Column(Geometry("POLYGON", srid=4326))  # Site boundary
    
    # Area measurements
    total_area_sqm = Column(Float)  # Total land area in square meters
    usable_area_sqm = Column(Float)  # Area available for construction
    reserved_area_sqm = Column(Float)  # Reserved for common facilities
    
    # Carrying capacity
    max_households = Column(Integer, default=0)  # Maximum sustainable households
    max_population = Column(Integer, default=0)  # Maximum sustainable population
    current_households = Column(Integer, default=0)
    current_population = Column(Integer, default=0)
    available_capacity = Column(Integer, default=0)  # Remaining household capacity
    
    # Suitability assessment
    suitability_score = Column(Float, default=0.0)  # 0.0 to 10.0
    land_type = Column(String)  # government, private, community
    terrain_type = Column(String)  # plain, hilly, coastal
    soil_quality = Column(String)  # excellent, good, moderate, poor
    elevation_meters = Column(Float)
    
    # Safety assessment
    flood_risk = Column(String, default="low")  # low, medium, high
    landslide_risk = Column(String, default="low")
    earthquake_risk = Column(String, default="low")
    distance_from_red_zones_km = Column(Float)  # Distance from nearest hazard zone
    safety_certification = Column(Boolean, default=False)
    
    # Infrastructure availability
    road_connectivity = Column(String)  # excellent, good, moderate, poor
    has_electricity = Column(Boolean, default=False)
    has_water_supply = Column(Boolean, default=False)
    has_drainage = Column(Boolean, default=False)
    has_sanitation = Column(Boolean, default=False)
    
    # Essential facilities (distances in km)
    nearest_hospital_km = Column(Float)
    nearest_school_km = Column(Float)
    nearest_market_km = Column(Float)
    nearest_police_station_km = Column(Float)
    
    # Infrastructure status
    infrastructure_score = Column(Float, default=0.0)  # 0-10 based on available facilities
    infrastructure_details = Column(JSON)  # Detailed infrastructure metadata
    """
    Example: {
        "water": {"source": "borewell", "capacity": "500L/day", "status": "operational"},
        "power": {"grid": true, "backup": "solar", "capacity": "100KW"},
        "roads": {"type": "paved", "width": "20ft", "condition": "good"}
    }
    """
    
    # Development status
    development_status = Column(String, default="proposed")  # proposed, planning, under_construction, ready, occupied
    construction_start_date = Column(DateTime(timezone=True))
    expected_completion_date = Column(DateTime(timezone=True))
    actual_completion_date = Column(DateTime(timezone=True))
    
    # Cost and budget
    estimated_cost = Column(Float)  # In local currency
    budget_allocated = Column(Float)
    budget_spent = Column(Float)
    
    # Administrative
    district = Column(String)
    state = Column(String)
    block = Column(String)
    gram_panchayat = Column(String)
    
    # Land acquisition
    land_acquisition_status = Column(String)  # proposed, in_progress, completed
    land_ownership_documents = Column(Text)  # Document references
    
    # Livelihood options
    livelihood_opportunities = Column(Text)  # Available employment/livelihood options
    economic_viability_score = Column(Float, default=0.0)
    
    # Status
    status = Column(String, default="active")  # active, inactive, full, reserved
    is_approved = Column(Boolean, default=False)
    approval_date = Column(DateTime(timezone=True))
    
    # Documentation
    description = Column(Text)
    site_survey_report = Column(Text)
    environmental_clearance = Column(Boolean, default=False)
    
    # Audit trail
    created_by_id = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
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
    
    @property
    def occupancy_percentage(self):
        if self.max_households == 0:
            return 0.0
        return (self.current_households / self.max_households) * 100
    
    def __repr__(self):
        return f"<RelocationSite {self.site_code}: {self.name}>"
