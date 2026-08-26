from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from app.db.session import Base

class VulnerableHabitation(Base):
    """
    Vulnerable habitations/villages in hazard zones requiring relocation.
    Tracks population, vulnerability factors, and relocation priority.
    """
    __tablename__ = "vulnerable_habitations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Habitation identification
    name = Column(String, nullable=False)  # Village/habitation name
    habitation_code = Column(String, unique=True, nullable=False, index=True)
    
    # Location
    location = Column(Geometry("POINT", srid=4326), nullable=False)
    boundary = Column(Geometry("POLYGON", srid=4326))  # Optional settlement boundary
    
    # Linked to hazard zone
    hazard_zone_id = Column(Integer, ForeignKey("hazard_zones.id"), nullable=True)
    hazard_zone = relationship("HazardZone")
    
    # Population data
    household_count = Column(Integer, default=0)
    population_count = Column(Integer, default=0)
    vulnerable_population = Column(Integer, default=0)  # Elderly, children, disabled
    
    # Vulnerability assessment
    vulnerability_score = Column(Float, default=0.0)  # 0.0 to 10.0
    building_type = Column(String)  # pucca, semi-pucca, kachha
    structural_safety_rating = Column(String)  # safe, moderate, unsafe, critical
    
    # Risk factors
    distance_from_hazard_km = Column(Float)  # Distance from epicenter/hazard source
    exposure_level = Column(String)  # direct, moderate, indirect
    past_disaster_impact = Column(Boolean, default=False)
    last_disaster_date = Column(DateTime(timezone=True))
    
    # Relocation priority
    relocation_priority = Column(String, nullable=False)  # immediate, short_term, medium_term, long_term
    priority_score = Column(Float, default=0.0)  # Calculated priority (0-100)
    
    # Socio-economic factors
    average_income_level = Column(String)  # low, medium, high
    primary_occupation = Column(String)  # agriculture, fishing, labor, etc.
    land_ownership = Column(String)  # owned, leased, encroached
    
    # Infrastructure
    has_road_access = Column(Boolean, default=True)
    has_electricity = Column(Boolean, default=True)
    has_water_supply = Column(Boolean, default=True)
    nearest_hospital_km = Column(Float)
    nearest_school_km = Column(Float)
    
    # Administrative
    district = Column(String)
    state = Column(String)
    gram_panchayat = Column(String)
    block = Column(String)
    
    # Status
    status = Column(String, default="identified")  # identified, assessed, approved_for_relocation, relocated, rejected
    relocation_status = Column(String)  # not_started, in_progress, completed
    target_relocation_date = Column(DateTime(timezone=True))
    actual_relocation_date = Column(DateTime(timezone=True))
    
    # Matched relocation site
    assigned_relocation_site_id = Column(Integer, ForeignKey("relocation_sites.id"), nullable=True)
    assigned_relocation_site = relationship("RelocationSite")
    
    # Documentation
    notes = Column(Text)
    assessment_report = Column(Text)  # Detailed assessment findings
    
    # Audit trail
    assessed_by_id = Column(Integer)  # Admin/surveyor
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
    
    def __repr__(self):
        return f"<VulnerableHabitation {self.habitation_code}: {self.name}>"
