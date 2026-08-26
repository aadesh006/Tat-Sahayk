from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ============== HAZARD ZONE SCHEMAS ==============

class HazardZoneBase(BaseModel):
    name: str
    zone_code: str
    zone_type: str = "red"
    risk_level: str
    hazard_types: Optional[List[str]] = []
    population_estimate: Optional[int] = 0
    households_estimate: Optional[int] = 0
    district: Optional[str] = None
    state: Optional[str] = None
    description: Optional[str] = None
    mitigation_measures: Optional[str] = None

class HazardZoneCreate(BaseModel):
    name: str
    zone_code: str
    boundary_geojson: dict  # GeoJSON polygon
    zone_type: str = "red"
    risk_level: str
    hazard_types: List[str] = []
    population_estimate: Optional[int] = 0
    households_estimate: Optional[int] = 0
    district: Optional[str] = None
    state: Optional[str] = None
    description: Optional[str] = None
    mitigation_measures: Optional[str] = None
    is_official: bool = False

class HazardZoneUpdate(BaseModel):
    name: Optional[str] = None
    boundary_geojson: Optional[dict] = None
    zone_type: Optional[str] = None
    risk_level: Optional[str] = None
    hazard_types: Optional[List[str]] = None
    population_estimate: Optional[int] = None
    households_estimate: Optional[int] = None
    historical_incidents_count: Optional[int] = None
    status: Optional[str] = None
    is_official: Optional[bool] = None
    description: Optional[str] = None
    mitigation_measures: Optional[str] = None

class HazardZoneResponse(BaseModel):
    id: int
    name: str
    zone_code: str
    boundary_geojson: dict
    area_sqkm: Optional[float]
    zone_type: str
    risk_level: str
    hazard_types: List[str]
    population_estimate: int
    households_estimate: int
    historical_incidents_count: int
    district: Optional[str]
    state: Optional[str]
    status: str
    is_official: bool
    ai_confidence_score: Optional[float]
    identified_by: str
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============== VULNERABLE HABITATION SCHEMAS ==============

class VulnerableHabitationBase(BaseModel):
    name: str
    habitation_code: str
    household_count: Optional[int] = 0
    population_count: Optional[int] = 0
    relocation_priority: str
    district: Optional[str] = None
    state: Optional[str] = None

class VulnerableHabitationCreate(BaseModel):
    name: str
    habitation_code: str
    latitude: float
    longitude: float
    boundary_geojson: Optional[dict] = None
    hazard_zone_id: Optional[int] = None
    household_count: int = 0
    population_count: int = 0
    vulnerable_population: Optional[int] = 0
    building_type: Optional[str] = None
    structural_safety_rating: Optional[str] = None
    distance_from_hazard_km: Optional[float] = None
    exposure_level: Optional[str] = None
    relocation_priority: str = "medium_term"
    priority_score: Optional[float] = 0.0
    district: Optional[str] = None
    state: Optional[str] = None
    gram_panchayat: Optional[str] = None
    block: Optional[str] = None
    notes: Optional[str] = None

class VulnerableHabitationUpdate(BaseModel):
    name: Optional[str] = None
    hazard_zone_id: Optional[int] = None
    household_count: Optional[int] = None
    population_count: Optional[int] = None
    vulnerable_population: Optional[int] = None
    vulnerability_score: Optional[float] = None
    building_type: Optional[str] = None
    structural_safety_rating: Optional[str] = None
    relocation_priority: Optional[str] = None
    priority_score: Optional[float] = None
    status: Optional[str] = None
    relocation_status: Optional[str] = None
    assigned_relocation_site_id: Optional[int] = None
    notes: Optional[str] = None
    assessment_report: Optional[str] = None

class VulnerableHabitationResponse(BaseModel):
    id: int
    name: str
    habitation_code: str
    latitude: Optional[float]
    longitude: Optional[float]
    hazard_zone_id: Optional[int]
    household_count: int
    population_count: int
    vulnerable_population: int
    vulnerability_score: float
    building_type: Optional[str]
    relocation_priority: str
    priority_score: float
    district: Optional[str]
    state: Optional[str]
    status: str
    relocation_status: Optional[str]
    assigned_relocation_site_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ============== RELOCATION SITE SCHEMAS ==============

class RelocationSiteBase(BaseModel):
    name: str
    site_code: str
    max_households: int = 0
    district: Optional[str] = None
    state: Optional[str] = None

class RelocationSiteCreate(BaseModel):
    name: str
    site_code: str
    latitude: float
    longitude: float
    boundary_geojson: Optional[dict] = None
    total_area_sqm: Optional[float] = None
    usable_area_sqm: Optional[float] = None
    max_households: int = 0
    max_population: int = 0
    suitability_score: Optional[float] = 0.0
    land_type: Optional[str] = None
    terrain_type: Optional[str] = None
    soil_quality: Optional[str] = None
    flood_risk: str = "low"
    landslide_risk: str = "low"
    earthquake_risk: str = "low"
    distance_from_red_zones_km: Optional[float] = None
    has_electricity: bool = False
    has_water_supply: bool = False
    has_drainage: bool = False
    district: Optional[str] = None
    state: Optional[str] = None
    development_status: str = "proposed"
    description: Optional[str] = None

class RelocationSiteUpdate(BaseModel):
    name: Optional[str] = None
    max_households: Optional[int] = None
    max_population: Optional[int] = None
    current_households: Optional[int] = None
    current_population: Optional[int] = None
    available_capacity: Optional[int] = None
    suitability_score: Optional[float] = None
    development_status: Optional[str] = None
    has_electricity: Optional[bool] = None
    has_water_supply: Optional[bool] = None
    has_drainage: Optional[bool] = None
    status: Optional[str] = None
    is_approved: Optional[bool] = None
    description: Optional[str] = None
    site_survey_report: Optional[str] = None

class RelocationSiteResponse(BaseModel):
    id: int
    name: str
    site_code: str
    latitude: Optional[float]
    longitude: Optional[float]
    total_area_sqm: Optional[float]
    usable_area_sqm: Optional[float]
    max_households: int
    max_population: int
    current_households: int
    current_population: int
    available_capacity: int
    occupancy_percentage: float
    suitability_score: float
    land_type: Optional[str]
    terrain_type: Optional[str]
    flood_risk: str
    landslide_risk: str
    earthquake_risk: str
    distance_from_red_zones_km: Optional[float]
    has_electricity: bool
    has_water_supply: bool
    has_drainage: bool
    infrastructure_score: float
    district: Optional[str]
    state: Optional[str]
    development_status: str
    status: str
    is_approved: bool
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============== STATISTICS & ANALYTICS SCHEMAS ==============

class RedZoneStats(BaseModel):
    total_zones: int
    zones_by_risk_level: dict  # {"critical": 5, "high": 10, ...}
    zones_by_status: dict
    total_affected_population: int
    total_affected_households: int

class RelocationStats(BaseModel):
    total_habitations: int
    habitations_by_priority: dict  # {"immediate": 10, "short_term": 25, ...}
    habitations_by_status: dict
    total_sites: int
    total_site_capacity: int
    occupied_capacity: int
    available_capacity: int
