from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============== ENUMS ==============

class RelocationPriority(str, Enum):
    immediate = "immediate"
    short_term = "short_term"
    medium_term = "medium_term"
    long_term = "long_term"

# ============== HAZARD ZONE SCHEMAS ==============

class HazardZoneCreate(BaseModel):
    zone_name: str
    district: str
    state: str
    hazard_types: List[str] = []
    intensity_level: str = "medium"
    risk_score: float = Field(ge=0, le=1, description="Risk score between 0 and 1")
    affected_population: Optional[int] = 0
    geometry: dict  # GeoJSON geometry
    status: str = "active"
    notes: Optional[str] = None

class HazardZoneUpdate(BaseModel):
    zone_name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    hazard_types: Optional[List[str]] = None
    intensity_level: Optional[str] = None
    risk_score: Optional[float] = Field(None, ge=0, le=1)
    affected_population: Optional[int] = None
    geometry: Optional[dict] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class HazardZoneResponse(BaseModel):
    id: int
    name: str  # Changed from zone_name
    zone_code: str
    district: str
    state: str
    hazard_types: List[str]
    risk_level: str  # Changed from intensity_level (and it's string not float)
    population_estimate: int  # Changed from affected_population
    geometry: dict
    status: str
    description: Optional[str]  # Changed from notes
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# ============== RELOCATION SITE SCHEMAS ==============

class RelocationSiteCreate(BaseModel):
    site_name: str
    district: str
    state: str
    carrying_capacity: int
    current_occupancy: Optional[int] = 0
    suitability_score: float = Field(ge=0, le=1, description="Suitability score between 0 and 1")
    infrastructure_available: List[str] = []
    water_availability: str = "adequate"
    accessibility_score: float = Field(ge=0, le=1, description="Accessibility score between 0 and 1")
    distance_to_town_km: Optional[float] = None
    land_area_hectares: Optional[float] = None
    geometry: dict  # GeoJSON geometry
    status: str = "available"
    notes: Optional[str] = None

class RelocationSiteUpdate(BaseModel):
    site_name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    carrying_capacity: Optional[int] = None
    current_occupancy: Optional[int] = None
    suitability_score: Optional[float] = Field(None, ge=0, le=1)
    infrastructure_available: Optional[List[str]] = None
    water_availability: Optional[str] = None
    accessibility_score: Optional[float] = Field(None, ge=0, le=1)
    distance_to_town_km: Optional[float] = None
    land_area_hectares: Optional[float] = None
    geometry: Optional[dict] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class RelocationSiteResponse(BaseModel):
    id: int
    name: str  # Changed from site_name
    site_code: str
    district: str
    state: str
    max_households: int  # Changed from carrying_capacity
    current_households: int  # Changed from current_occupancy
    suitability_score: float
    has_electricity: bool
    has_water_supply: bool
    has_drainage: bool
    road_connectivity: Optional[str]
    geometry: dict
    status: str
    description: Optional[str]  # Changed from notes
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# ============== VULNERABLE HABITATION SCHEMAS ==============

class VulnerableHabitationCreate(BaseModel):
    habitation_name: str
    district: str
    state: str
    population_count: int
    households: Optional[int] = None
    vulnerability_score: float = Field(ge=0, le=1, description="Vulnerability score between 0 and 1")
    relocation_priority: RelocationPriority = RelocationPriority.medium_term
    hazard_zone_id: Optional[int] = None
    assigned_relocation_site_id: Optional[int] = None
    relocation_status: str = "not_started"
    geometry: dict  # GeoJSON geometry (point)
    notes: Optional[str] = None

class VulnerableHabitationUpdate(BaseModel):
    habitation_name: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    population_count: Optional[int] = None
    households: Optional[int] = None
    vulnerability_score: Optional[float] = Field(None, ge=0, le=1)
    relocation_priority: Optional[RelocationPriority] = None
    hazard_zone_id: Optional[int] = None
    assigned_relocation_site_id: Optional[int] = None
    relocation_status: Optional[str] = None
    geometry: Optional[dict] = None
    notes: Optional[str] = None

class VulnerableHabitationResponse(BaseModel):
    id: int
    name: str  # Changed from habitation_name
    habitation_code: str
    district: str
    state: str
    population_count: int
    household_count: int  # Changed from households
    vulnerability_score: float
    relocation_priority: str
    hazard_zone_id: Optional[int]
    assigned_relocation_site_id: Optional[int]
    relocation_status: str
    geometry: dict
    notes: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
