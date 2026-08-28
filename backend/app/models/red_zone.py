"""
Red Zone Management Models for Tat-Sahayk
Handles hazard zones, relocation sites, and vulnerable habitations
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, ARRAY
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.db.session import Base


class HazardZone(Base):
    """
    Red Zone polygons marking permanently unsafe areas
    Represents areas requiring permanent habitation relocation
    """
    __tablename__ = "hazard_zones"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False, index=True)
    state = Column(String, nullable=False)
    hazard_types = Column(ARRAY(String), default=[])  # ['flood', 'landslide', 'cyclone']
    intensity = Column(String, default="medium")  # low/medium/high/critical
    boundary = Column(Geometry("POLYGON", srid=4326))  # GIS polygon
    center_lat = Column(Float)  # computed center
    center_lon = Column(Float)
    population_at_risk = Column(Integer, default=0)
    affected_area_sqkm = Column(Float, default=0.0)
    ai_confidence = Column(Float, default=0.0)  # 0-1 confidence score
    ai_reasoning = Column(Text)
    source = Column(String, default="manual")  # manual/auto_cluster/imported
    is_active = Column(Boolean, default=True, index=True)
    last_incident_date = Column(DateTime(timezone=True))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RelocationSite(Base):
    """
    Safe zones with capacity for relocating vulnerable populations
    Represents government-approved relocation sites
    """
    __tablename__ = "relocation_sites"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False, index=True)
    state = Column(String, nullable=False)
    location = Column(Geometry("POINT", srid=4326))
    latitude = Column(Float)
    longitude = Column(Float)
    carrying_capacity = Column(Integer, default=0)  # max households
    current_occupancy = Column(Integer, default=0)
    available_capacity = Column(Integer, default=0)  # computed
    facilities = Column(ARRAY(String), default=[])  # ['water', 'electricity', 'school', 'hospital', 'road']
    suitability_score = Column(Float, default=0.0)  # 0-1, AI assessed
    hazard_free_radius_km = Column(Float, default=5.0)
    land_area_sqkm = Column(Float)
    ai_assessment = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class VulnerableHabitation(Base):
    """
    Settlements at risk requiring relocation assessment
    Represents villages/settlements in or near hazard zones
    """
    __tablename__ = "vulnerable_habitations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # village/settlement name
    district = Column(String, nullable=False, index=True)
    state = Column(String, nullable=False)
    location = Column(Geometry("POINT", srid=4326))
    latitude = Column(Float)
    longitude = Column(Float)
    population = Column(Integer, default=0)
    households = Column(Integer, default=0)
    hazard_types = Column(ARRAY(String), default=[])
    exposure_score = Column(Float, default=0.0)  # 0-1 from spatial analysis
    vulnerability_score = Column(Float, default=0.0)  # 0-1 composite
    priority = Column(String, default="MEDIUM_TERM", index=True)  # IMMEDIATE/SHORT_TERM/MEDIUM_TERM/SAFE
    priority_reason = Column(Text)
    estimated_timeline_months = Column(Integer)
    nearest_hazard_zone_id = Column(Integer, ForeignKey("hazard_zones.id"), nullable=True)
    recommended_site_id = Column(Integer, ForeignKey("relocation_sites.id"), nullable=True)
    relocation_status = Column(String, default="pending")  # pending/in_progress/completed
    last_assessed = Column(DateTime(timezone=True))
    ai_assessment = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
