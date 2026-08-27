"""
Pydantic schemas for Red Zone Management System
Request/Response validation for hazard zones, relocation sites, and vulnerable habitations
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ==================== HAZARD ZONE SCHEMAS ====================

class HazardZoneCreate(BaseModel):
    """Schema for creating a new hazard zone"""
    name: str = Field(..., min_length=1, max_length=200)
    district: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    hazard_types: List[str] = Field(default_factory=list)
    intensity: str = Field(default="medium")  # low/medium/high/critical
    boundary: Optional[Dict[str, Any]] = None  # GeoJSON geometry
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    population_at_risk: int = Field(default=0, ge=0)
    affected_area_sqkm: float = Field(default=0.0, ge=0)
    last_incident_date: Optional[datetime] = None


class HazardZoneUpdate(BaseModel):
    """Schema for updating an existing hazard zone"""
    name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    hazard_types: Optional[List[str]] = None
    intensity: Optional[str] = None
    boundary: Optional[Dict[str, Any]] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    population_at_risk: Optional[int] = None
    affected_area_sqkm: Optional[float] = None
    is_active: Optional[bool] = None
    last_incident_date: Optional[datetime] = None


class HazardZoneResponse(BaseModel):
    """Schema for hazard zone response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    district: str
    state: str
    hazard_types: List[str]
    intensity: str
    boundary: Optional[Dict[str, Any]] = None  # GeoJSON
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    population_at_risk: int
    affected_area_sqkm: float
    ai_confidence: float
    ai_reasoning: Optional[str] = None
    source: str
    is_active: bool
    last_incident_date: Optional[datetime] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ==================== RELOCATION SITE SCHEMAS ====================

class RelocationSiteCreate(BaseModel):
    """Schema for creating a new relocation site"""
    name: str = Field(..., min_length=1, max_length=200)
    district: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    carrying_capacity: int = Field(default=0, ge=0)
    current_occupancy: int = Field(default=0, ge=0)
    facilities: List[str] = Field(default_factory=list)
    hazard_free_radius_km: float = Field(default=5.0, ge=0)
    land_area_sqkm: Optional[float] = Field(default=None, ge=0)


class RelocationSiteUpdate(BaseModel):
    """Schema for updating an existing relocation site"""
    name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    carrying_capacity: Optional[int] = Field(default=None, ge=0)
    current_occupancy: Optional[int] = Field(default=None, ge=0)
    facilities: Optional[List[str]] = None
    hazard_free_radius_km: Optional[float] = Field(default=None, ge=0)
    land_area_sqkm: Optional[float] = Field(default=None, ge=0)
    is_active: Optional[bool] = None


class RelocationSiteResponse(BaseModel):
    """Schema for relocation site response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    district: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    carrying_capacity: int
    current_occupancy: int
    available_capacity: int
    facilities: List[str]
    suitability_score: float
    hazard_free_radius_km: float
    land_area_sqkm: Optional[float] = None
    ai_assessment: Optional[str] = None
    is_active: bool
    created_by: Optional[int] = None
    created_at: datetime


# ==================== VULNERABLE HABITATION SCHEMAS ====================

class VulnerableHabitationCreate(BaseModel):
    """Schema for creating/registering a new vulnerable habitation"""
    name: str = Field(..., min_length=1, max_length=200)
    district: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    population: int = Field(default=0, ge=0)
    households: int = Field(default=0, ge=0)
    hazard_types: List[str] = Field(default_factory=list)


class VulnerableHabitationUpdate(BaseModel):
    """Schema for updating a vulnerable habitation"""
    name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    population: Optional[int] = Field(default=None, ge=0)
    households: Optional[int] = Field(default=None, ge=0)
    hazard_types: Optional[List[str]] = None
    priority: Optional[str] = None
    priority_reason: Optional[str] = None
    estimated_timeline_months: Optional[int] = Field(default=None, ge=0)
    recommended_site_id: Optional[int] = None
    relocation_status: Optional[str] = None


class VulnerableHabitationResponse(BaseModel):
    """Schema for vulnerable habitation response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    district: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    population: int
    households: int
    hazard_types: List[str]
    exposure_score: float
    vulnerability_score: float
    priority: str
    priority_reason: Optional[str] = None
    estimated_timeline_months: Optional[int] = None
    nearest_hazard_zone_id: Optional[int] = None
    recommended_site_id: Optional[int] = None
    relocation_status: str
    last_assessed: Optional[datetime] = None
    ai_assessment: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime


# ==================== SPATIAL ANALYSIS SCHEMAS ====================

class HabitationsAtRiskResponse(BaseModel):
    """Response for habitations within hazard zones"""
    habitation_id: int
    habitation_name: str
    district: str
    population: int
    hazard_zone_id: int
    hazard_zone_name: str
    distance_km: float
    priority: str


class NearbySitesResponse(BaseModel):
    """Response for nearby relocation sites"""
    site_id: int
    site_name: str
    district: str
    distance_km: float
    available_capacity: int
    suitability_score: float
    facilities: List[str]


# ==================== SDMA DASHBOARD SCHEMAS ====================

class SDMAStatsResponse(BaseModel):
    """Statistics for SDMA dashboard"""
    active_red_zones: int
    total_population_at_risk: int
    total_habitations: int
    immediate_priority_count: int
    short_term_priority_count: int
    medium_term_priority_count: int
    safe_count: int
    total_relocation_sites: int
    total_site_capacity: int
    total_site_occupancy: int
    capacity_gap: int


class ResourceRequirements(BaseModel):
    """Resource requirements for relocation"""
    estimated_cost_crore: float
    transport_vehicles: int
    temporary_shelters_needed: int


class Timeline(BaseModel):
    """Timeline breakdown for actions"""
    immediate_0_3_months: str
    short_term_3_12_months: str
    medium_term_1_2_years: str


class SDMASummaryResponse(BaseModel):
    """AI-generated executive summary for SDMA"""
    executive_summary: str
    immediate_actions: List[str]
    resource_requirements: ResourceRequirements
    timeline: Timeline
    risk_level: str  # LOW/MEDIUM/HIGH/CRITICAL


# ==================== MAP DATA SCHEMAS ====================

class GeoJSONFeature(BaseModel):
    """GeoJSON Feature"""
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


class GeoJSONFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection"""
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]


# ==================== AI ASSESSMENT SCHEMAS ====================

class AIAssessmentResponse(BaseModel):
    """Response from AI assessment"""
    success: bool
    message: str
    assessment: Optional[Dict[str, Any]] = None
    updated_fields: Optional[Dict[str, Any]] = None
