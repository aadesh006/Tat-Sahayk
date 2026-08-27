from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from geoalchemy2.functions import ST_AsGeoJSON, ST_GeomFromGeoJSON
from geoalchemy2.shape import to_shape
import json

from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.hazard_zone import HazardZone
from app.models.relocation_site import RelocationSite
from app.models.vulnerable_habitation import VulnerableHabitation
from app.schemas.red_zone import (
    HazardZoneCreate,
    HazardZoneUpdate,
    HazardZoneResponse,
    RelocationSiteCreate,
    RelocationSiteUpdate,
    RelocationSiteResponse,
    VulnerableHabitationCreate,
    VulnerableHabitationUpdate,
    VulnerableHabitationResponse,
    RelocationPriority
)

router = APIRouter()

# ─── HAZARD ZONES ─────────────────────────────────────────────────────────────

@router.post("/hazard-zones", response_model=HazardZoneResponse, status_code=status.HTTP_201_CREATED)
def create_hazard_zone(
    *,
    db: Session = Depends(get_db),
    zone_in: HazardZoneCreate,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Create a new hazard zone (Red Zone).
    Admin only. District admins can only create zones in their district.
    """
    # Check district permissions
    if current_user.district and zone_in.district.lower() != current_user.district.lower():
        raise HTTPException(
            status_code=403, 
            detail=f"You can only create zones in {current_user.district} district"
        )
    
    # Convert GeoJSON to PostGIS geometry
    geometry_geojson = json.dumps(zone_in.geometry)
    
    hazard_zone = HazardZone(
        name=zone_in.zone_name,
        zone_code=f"RZ-{zone_in.district[:3].upper()}-{datetime.now().year}-{str(datetime.now().timestamp()).split('.')[1][:3]}",
        district=zone_in.district,
        state=zone_in.state,
        hazard_types=zone_in.hazard_types,
        risk_level=zone_in.intensity_level,
        population_estimate=zone_in.affected_population,
        boundary=func.ST_GeomFromGeoJSON(geometry_geojson),
        status=zone_in.status,
        description=zone_in.notes,
        created_by_id=current_user.id
    )
    
    db.add(hazard_zone)
    db.commit()
    db.refresh(hazard_zone)
    
    # Convert geometry to GeoJSON for response
    geom_json = db.scalar(ST_AsGeoJSON(hazard_zone.boundary))
    creator = db.query(User).filter(User.id == hazard_zone.created_by_id).first()
    
    return {
        "id": hazard_zone.id,
        "name": hazard_zone.name,
        "zone_code": hazard_zone.zone_code,
        "district": hazard_zone.district,
        "state": hazard_zone.state,
        "hazard_types": hazard_zone.hazard_types or [],
        "risk_level": hazard_zone.risk_level,
        "population_estimate": hazard_zone.population_estimate,
        "geometry": json.loads(geom_json) if geom_json else None,
        "status": hazard_zone.status,
        "description": hazard_zone.description,
        "created_by": creator.full_name if creator else "System",
        "created_at": hazard_zone.created_at,
        "updated_at": hazard_zone.updated_at
    }


@router.get("/hazard-zones", response_model=List[HazardZoneResponse])
def list_hazard_zones(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_admin_user),
    district: Optional[str] = None,
    state: Optional[str] = None,
    status_filter: Optional[str] = None,
    hazard_type: Optional[str] = None
):
    """
    List all hazard zones with optional filters.
    Admin only.
    """
    query = db.query(HazardZone)
    
    # Apply filters
    if district:
        query = query.filter(HazardZone.district.ilike(f"%{district}%"))
    
    if state:
        query = query.filter(HazardZone.state.ilike(f"%{state}%"))
    
    if status_filter:
        query = query.filter(HazardZone.status == status_filter)
    
    if hazard_type:
        query = query.filter(HazardZone.hazard_types.contains([hazard_type]))
    
    # District admin sees only their district
    if current_user.district:
        query = query.filter(HazardZone.district.ilike(f"%{current_user.district}%"))
    
    zones = query.order_by(HazardZone.risk_level.desc()).all()
    
    result = []
    for zone in zones:
        geom_json = db.scalar(ST_AsGeoJSON(zone.boundary))
        creator = db.query(User).filter(User.id == zone.created_by_id).first()
        
        result.append({
            **zone.__dict__,
            "geometry": json.loads(geom_json) if geom_json else None,
            "created_by": creator.full_name if creator else "System"
        })
    
    return result


@router.get("/hazard-zones/{zone_id}", response_model=HazardZoneResponse)
def get_hazard_zone(
    *,
    db: Session = Depends(get_db),
    zone_id: int,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Get a specific hazard zone by ID.
    Admin only.
    """
    zone = db.query(HazardZone).filter(HazardZone.id == zone_id).first()
    
    if not zone:
        raise HTTPException(status_code=404, detail="Hazard zone not found")
    
    # Check district access
    if current_user.district and zone.district != current_user.district:
        raise HTTPException(status_code=403, detail="Access denied to this district's zones")
    
    geom_json = db.scalar(ST_AsGeoJSON(zone.boundary))
    creator = db.query(User).filter(User.id == zone.created_by_id).first()
    
    return {
        **zone.__dict__,
        "geometry": json.loads(geom_json) if geom_json else None,
        "created_by": creator.full_name if creator else "System"
    }


@router.patch("/hazard-zones/{zone_id}", response_model=HazardZoneResponse)
def update_hazard_zone(
    *,
    db: Session = Depends(get_db),
    zone_id: int,
    zone_update: HazardZoneUpdate,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Update an existing hazard zone.
    Admin only.
    """
    zone = db.query(HazardZone).filter(HazardZone.id == zone_id).first()
    
    if not zone:
        raise HTTPException(status_code=404, detail="Hazard zone not found")
    
    # Check district access
    if current_user.district and zone.district != current_user.district:
        raise HTTPException(status_code=403, detail="Access denied to this district's zones")
    
    # Prevent changing district if district admin
    if current_user.district and zone_update.district and zone_update.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail=f"You cannot move zones to other districts")
    
    # Update fields
    update_data = zone_update.dict(exclude_unset=True)
    
    # Handle geometry update
    if "geometry" in update_data and update_data["geometry"]:
        geometry_geojson = json.dumps(update_data["geometry"])
        zone.boundary = func.ST_GeomFromGeoJSON(geometry_geojson)
        del update_data["geometry"]
    
    for field, value in update_data.items():
        setattr(zone, field, value)
    
    zone.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(zone)
    
    geom_json = db.scalar(ST_AsGeoJSON(zone.boundary))
    creator = db.query(User).filter(User.id == zone.created_by_id).first()
    
    return {
        **zone.__dict__,
        "geometry": json.loads(geom_json) if geom_json else None,
        "created_by": creator.full_name if creator else "System"
    }


@router.delete("/hazard-zones/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hazard_zone(
    *,
    db: Session = Depends(get_db),
    zone_id: int,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Delete a hazard zone.
    Admin only.
    """
    zone = db.query(HazardZone).filter(HazardZone.id == zone_id).first()
    
    if not zone:
        raise HTTPException(status_code=404, detail="Hazard zone not found")
    
    # Check district access
    if current_user.district and zone.district != current_user.district:
        raise HTTPException(status_code=403, detail="Access denied to this district's zones")
    
    db.delete(zone)
    db.commit()
    
    return None


# ─── RELOCATION SITES ─────────────────────────────────────────────────────────

@router.post("/relocation-sites", response_model=RelocationSiteResponse, status_code=status.HTTP_201_CREATED)
def create_relocation_site(
    *,
    db: Session = Depends(get_db),
    site_in: RelocationSiteCreate,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Create a new relocation site.
    Admin only. District admins can only create sites in their district.
    """
    # Check district permissions
    if current_user.district and site_in.district.lower() != current_user.district.lower():
        raise HTTPException(
            status_code=403, 
            detail=f"You can only create sites in {current_user.district} district"
        )
    
    # Convert GeoJSON to PostGIS geometry
    geometry_geojson = json.dumps(site_in.geometry)
    
    site = RelocationSite(
        name=site_in.site_name,
        site_code=f"RS-{site_in.district[:3].upper()}-{datetime.now().year}-{str(datetime.now().timestamp()).split('.')[1][:3]}",
        district=site_in.district,
        state=site_in.state,
        max_households=site_in.carrying_capacity,
        current_households=site_in.current_occupancy or 0,
        suitability_score=site_in.suitability_score,
        has_electricity="electricity" in site_in.infrastructure_available,
        has_water_supply="water_supply" in site_in.infrastructure_available,
        has_drainage="drainage" in site_in.infrastructure_available,
        road_connectivity=site_in.water_availability,
        location=func.ST_GeomFromGeoJSON(geometry_geojson),
        status=site_in.status,
        description=site_in.notes,
        created_by_id=current_user.id
    )
    
    db.add(site)
    db.commit()
    db.refresh(site)
    
    geom_json = db.scalar(ST_AsGeoJSON(site.location))
    creator = db.query(User).filter(User.id == site.created_by_id).first()
    
    return {
        "id": site.id,
        "name": site.name,
        "site_code": site.site_code,
        "district": site.district,
        "state": site.state,
        "max_households": site.max_households,
        "current_households": site.current_households,
        "suitability_score": site.suitability_score,
        "has_electricity": site.has_electricity,
        "has_water_supply": site.has_water_supply,
        "has_drainage": site.has_drainage,
        "road_connectivity": site.road_connectivity,
        "geometry": json.loads(geom_json) if geom_json else None,
        "status": site.status,
        "description": site.description,
        "created_by": creator.full_name if creator else "System",
        "created_at": site.created_at,
        "updated_at": site.updated_at
    }


@router.get("/relocation-sites", response_model=List[RelocationSiteResponse])
def list_relocation_sites(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_admin_user),
    district: Optional[str] = None,
    state: Optional[str] = None,
    status_filter: Optional[str] = None,
    min_capacity: Optional[int] = None
):
    """
    List all relocation sites with optional filters.
    Admin only.
    """
    query = db.query(RelocationSite)
    
    if district:
        query = query.filter(RelocationSite.district.ilike(f"%{district}%"))
    
    if state:
        query = query.filter(RelocationSite.state.ilike(f"%{state}%"))
    
    if status_filter:
        query = query.filter(RelocationSite.status == status_filter)
    
    if min_capacity:
        query = query.filter(RelocationSite.max_households >= min_capacity)
    
    # District admin sees only their district
    if current_user.district:
        query = query.filter(RelocationSite.district.ilike(f"%{current_user.district}%"))
    
    sites = query.order_by(RelocationSite.suitability_score.desc()).all()
    
    result = []
    for site in sites:
        geom_json = db.scalar(ST_AsGeoJSON(site.location))
        creator = db.query(User).filter(User.id == site.created_by_id).first()
        
        result.append({
            **site.__dict__,
            "geometry": json.loads(geom_json) if geom_json else None,
            "created_by": creator.full_name if creator else "System"
        })
    
    return result


@router.get("/relocation-sites/{site_id}", response_model=RelocationSiteResponse)
def get_relocation_site(
    *,
    db: Session = Depends(get_db),
    site_id: int,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Get a specific relocation site by ID.
    Admin only.
    """
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
    
    if current_user.district and site.district != current_user.district:
        raise HTTPException(status_code=403, detail="Access denied to this district's sites")
    
    geom_json = db.scalar(ST_AsGeoJSON(site.location))
    creator = db.query(User).filter(User.id == site.created_by_id).first()
    
    return {
        **site.__dict__,
        "geometry": json.loads(geom_json) if geom_json else None,
        "created_by": creator.full_name if creator else "System"
    }


@router.patch("/relocation-sites/{site_id}", response_model=RelocationSiteResponse)
def update_relocation_site(
    *,
    db: Session = Depends(get_db),
    site_id: int,
    site_update: RelocationSiteUpdate,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Update an existing relocation site.
    Admin only.
    """
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
    
    if current_user.district and site.district != current_user.district:
        raise HTTPException(status_code=403, detail="Access denied to this district's sites")
    
    # Prevent changing district if district admin
    if current_user.district and site_update.district and site_update.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail=f"You cannot move sites to other districts")
    
    update_data = site_update.dict(exclude_unset=True)
    
    if "geometry" in update_data and update_data["geometry"]:
        geometry_geojson = json.dumps(update_data["geometry"])
        site.location = func.ST_GeomFromGeoJSON(geometry_geojson)
        del update_data["geometry"]
    
    for field, value in update_data.items():
        setattr(site, field, value)
    
    site.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(site)
    
    geom_json = db.scalar(ST_AsGeoJSON(site.location))
    creator = db.query(User).filter(User.id == site.created_by_id).first()
    
    return {
        **site.__dict__,
        "geometry": json.loads(geom_json) if geom_json else None,
        "created_by": creator.full_name if creator else "System"
    }


@router.delete("/relocation-sites/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relocation_site(
    *,
    db: Session = Depends(get_db),
    site_id: int,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Delete a relocation site.
    Admin only.
    """
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
    
    if current_user.district and site.district != current_user.district:
        raise HTTPException(status_code=403, detail="Access denied to this district's sites")
    
    db.delete(site)
    db.commit()
    
    return None


# ─── VULNERABLE HABITATIONS ───────────────────────────────────────────────────

@router.post("/vulnerable-habitations", response_model=VulnerableHabitationResponse, status_code=status.HTTP_201_CREATED)
def create_vulnerable_habitation(
    *,
    db: Session = Depends(get_db),
    habitation_in: VulnerableHabitationCreate,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Register a new vulnerable habitation.
    Admin only. District admins can only create habitations in their district.
    """
    # Check district permissions
    if current_user.district and habitation_in.district.lower() != current_user.district.lower():
        raise HTTPException(
            status_code=403, 
            detail=f"You can only create habitations in {current_user.district} district"
        )
    
    # Convert GeoJSON to PostGIS geometry (point location)
    geometry_geojson = json.dumps(habitation_in.geometry)
    
    habitation = VulnerableHabitation(
        name=habitation_in.habitation_name,
        habitation_code=f"VH-{habitation_in.district[:3].upper()}-{datetime.now().year}-{str(datetime.now().timestamp()).split('.')[1][:3]}",
        district=habitation_in.district,
        state=habitation_in.state,
        population_count=habitation_in.population_count,
        household_count=habitation_in.households or 0,
        vulnerability_score=habitation_in.vulnerability_score,
        relocation_priority=habitation_in.relocation_priority,
        hazard_zone_id=habitation_in.hazard_zone_id,
        assigned_relocation_site_id=habitation_in.assigned_relocation_site_id,
        relocation_status=habitation_in.relocation_status or "not_started",
        location=func.ST_GeomFromGeoJSON(geometry_geojson),
        notes=habitation_in.notes,
        assessed_by_id=current_user.id
    )
    
    db.add(habitation)
    db.commit()
    db.refresh(habitation)
    
    geom_json = db.scalar(ST_AsGeoJSON(habitation.location))
    creator = db.query(User).filter(User.id == habitation.assessed_by_id).first()
    
    return {
        "id": habitation.id,
        "name": habitation.name,
        "habitation_code": habitation.habitation_code,
        "district": habitation.district,
        "state": habitation.state,
        "population_count": habitation.population_count,
        "household_count": habitation.household_count,
        "vulnerability_score": habitation.vulnerability_score,
        "relocation_priority": habitation.relocation_priority,
        "hazard_zone_id": habitation.hazard_zone_id,
        "assigned_relocation_site_id": habitation.assigned_relocation_site_id,
        "relocation_status": habitation.relocation_status,
        "geometry": json.loads(geom_json) if geom_json else None,
        "notes": habitation.notes,
        "created_by": creator.full_name if creator else "System",
        "created_at": habitation.created_at,
        "updated_at": habitation.updated_at
    }


@router.get("/vulnerable-habitations", response_model=List[VulnerableHabitationResponse])
def list_vulnerable_habitations(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_admin_user),
    district: Optional[str] = None,
    state: Optional[str] = None,
    priority: Optional[RelocationPriority] = None,
    relocation_status: Optional[str] = None
):
    """
    List all vulnerable habitations with optional filters.
    Admin only.
    """
    query = db.query(VulnerableHabitation)
    
    if district:
        query = query.filter(VulnerableHabitation.district.ilike(f"%{district}%"))
    
    if state:
        query = query.filter(VulnerableHabitation.state.ilike(f"%{state}%"))
    
    if priority:
        query = query.filter(VulnerableHabitation.relocation_priority == priority)
    
    if relocation_status:
        query = query.filter(VulnerableHabitation.relocation_status == relocation_status)
    
    # District admin sees only their district
    if current_user.district:
        query = query.filter(VulnerableHabitation.district.ilike(f"%{current_user.district}%"))
    
    habitations = query.order_by(VulnerableHabitation.vulnerability_score.desc()).all()
    
    result = []
    for hab in habitations:
        geom_json = db.scalar(ST_AsGeoJSON(hab.location))
        creator = db.query(User).filter(User.id == hab.assessed_by_id).first()
        
        result.append({
            **hab.__dict__,
            "geometry": json.loads(geom_json) if geom_json else None,
            "created_by": creator.full_name if creator else "System"
        })
    
    return result


@router.get("/vulnerable-habitations/{habitation_id}", response_model=VulnerableHabitationResponse)
def get_vulnerable_habitation(
    *,
    db: Session = Depends(get_db),
    habitation_id: int,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Get a specific vulnerable habitation by ID.
    Admin only.
    """
    hab = db.query(VulnerableHabitation).filter(VulnerableHabitation.id == habitation_id).first()
    
    if not hab:
        raise HTTPException(status_code=404, detail="Vulnerable habitation not found")
    
    if current_user.district and hab.district != current_user.district:
        raise HTTPException(status_code=403, detail="Access denied to this district's habitations")
    
    geom_json = db.scalar(ST_AsGeoJSON(hab.location))
    creator = db.query(User).filter(User.id == hab.created_by_id).first()
    
    return {
        **hab.__dict__,
        "geometry": json.loads(geom_json) if geom_json else None,
        "created_by": creator.full_name if creator else "System"
    }


@router.patch("/vulnerable-habitations/{habitation_id}", response_model=VulnerableHabitationResponse)
def update_vulnerable_habitation(
    *,
    db: Session = Depends(get_db),
    habitation_id: int,
    habitation_update: VulnerableHabitationUpdate,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Update an existing vulnerable habitation.
    Admin only.
    """
    hab = db.query(VulnerableHabitation).filter(VulnerableHabitation.id == habitation_id).first()
    
    if not hab:
        raise HTTPException(status_code=404, detail="Vulnerable habitation not found")
    
    if current_user.district and hab.district != current_user.district:
        raise HTTPException(status_code=403, detail="Access denied to this district's habitations")
    
    # Prevent changing district if district admin
    if current_user.district and habitation_update.district and habitation_update.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail=f"You cannot move habitations to other districts")
    
    update_data = habitation_update.dict(exclude_unset=True)
    
    if "geometry" in update_data and update_data["geometry"]:
        geometry_geojson = json.dumps(update_data["geometry"])
        hab.location = func.ST_GeomFromGeoJSON(geometry_geojson)
        del update_data["geometry"]
    
    for field, value in update_data.items():
        setattr(hab, field, value)
    
    hab.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(hab)
    
    geom_json = db.scalar(ST_AsGeoJSON(hab.location))
    creator = db.query(User).filter(User.id == hab.created_by_id).first()
    
    return {
        **hab.__dict__,
        "geometry": json.loads(geom_json) if geom_json else None,
        "created_by": creator.full_name if creator else "System"
    }


@router.delete("/vulnerable-habitations/{habitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vulnerable_habitation(
    *,
    db: Session = Depends(get_db),
    habitation_id: int,
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Delete a vulnerable habitation record.
    Admin only.
    """
    hab = db.query(VulnerableHabitation).filter(VulnerableHabitation.id == habitation_id).first()
    
    if not hab:
        raise HTTPException(status_code=404, detail="Vulnerable habitation not found")
    
    if current_user.district and hab.district != current_user.district:
        raise HTTPException(status_code=403, detail="Access denied to this district's habitations")
    
    db.delete(hab)
    db.commit()
    
    return None


# ─── ANALYTICS & PRIORITIZATION ───────────────────────────────────────────────

@router.get("/dashboard/statistics")
def get_dashboard_statistics(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_admin_user),
    district: Optional[str] = None
):
    """
    Get summary statistics for Red Zone Management dashboard.
    Admin only.
    """
    # Base queries
    zones_query = db.query(HazardZone)
    sites_query = db.query(RelocationSite)
    habitations_query = db.query(VulnerableHabitation)
    
    # Apply district filter for district admins
    if current_user.district or district:
        filter_district = district or current_user.district
        zones_query = zones_query.filter(HazardZone.district.ilike(f"%{filter_district}%"))
        sites_query = sites_query.filter(RelocationSite.district.ilike(f"%{filter_district}%"))
        habitations_query = habitations_query.filter(VulnerableHabitation.district.ilike(f"%{filter_district}%"))
    
    # Hazard zones stats
    total_zones = zones_query.count()
    active_zones = zones_query.filter(HazardZone.status == "active").count()
    high_risk_zones = zones_query.filter(HazardZone.risk_level == "critical").count() + zones_query.filter(HazardZone.risk_level == "high").count()
    total_affected_population = db.query(func.sum(HazardZone.population_estimate)).scalar() or 0
    
    # Relocation sites stats
    total_sites = sites_query.count()
    available_sites = sites_query.filter(RelocationSite.status == "available").count()
    total_capacity = db.query(func.sum(RelocationSite.max_households)).scalar() or 0
    current_occupancy = db.query(func.sum(RelocationSite.current_households)).scalar() or 0
    available_capacity = total_capacity - current_occupancy
    
    # Vulnerable habitations stats
    total_habitations = habitations_query.count()
    immediate_priority = habitations_query.filter(VulnerableHabitation.relocation_priority == "immediate").count()
    short_term_priority = habitations_query.filter(VulnerableHabitation.relocation_priority == "short_term").count()
    medium_term_priority = habitations_query.filter(VulnerableHabitation.relocation_priority == "medium_term").count()
    
    # Relocation status breakdown
    not_started = habitations_query.filter(VulnerableHabitation.relocation_status == "not_started").count()
    in_progress = habitations_query.filter(VulnerableHabitation.relocation_status == "in_progress").count()
    completed = habitations_query.filter(VulnerableHabitation.relocation_status == "completed").count()
    
    # Total vulnerable population
    total_vulnerable_population = db.query(func.sum(VulnerableHabitation.population_count)).scalar() or 0
    
    return {
        "hazard_zones": {
            "total": total_zones,
            "active": active_zones,
            "high_risk": high_risk_zones,
            "affected_population": total_affected_population
        },
        "relocation_sites": {
            "total": total_sites,
            "available": available_sites,
            "total_capacity": total_capacity,
            "current_occupancy": current_occupancy,
            "available_capacity": available_capacity,
            "capacity_utilization_percent": round((current_occupancy / total_capacity * 100) if total_capacity > 0 else 0, 1)
        },
        "vulnerable_habitations": {
            "total": total_habitations,
            "immediate_priority": immediate_priority,
            "short_term_priority": short_term_priority,
            "medium_term_priority": medium_term_priority,
            "total_population": total_vulnerable_population
        },
        "relocation_progress": {
            "not_started": not_started,
            "in_progress": in_progress,
            "completed": completed,
            "completion_rate_percent": round((completed / total_habitations * 100) if total_habitations > 0 else 0, 1)
        }
    }


@router.get("/prioritization/recommendations")
def get_relocation_recommendations(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_admin_user),
    district: Optional[str] = None,
    limit: int = 20
):
    """
    Get AI-driven relocation recommendations prioritized by urgency.
    Considers vulnerability score, population, and available capacity.
    Admin only.
    """
    # Get habitations that need relocation
    query = db.query(VulnerableHabitation).filter(
        VulnerableHabitation.relocation_status.in_(["not_started", "in_progress"])
    )
    
    # Apply district filter
    if current_user.district or district:
        filter_district = district or current_user.district
        query = query.filter(VulnerableHabitation.district.ilike(f"%{filter_district}%"))
    
    # Order by priority and vulnerability score
    priority_order = {
        "immediate": 1,
        "short_term": 2,
        "medium_term": 3,
        "long_term": 4
    }
    
    habitations = query.order_by(
        VulnerableHabitation.vulnerability_score.desc()
    ).limit(limit).all()
    
    recommendations = []
    
    for hab in habitations:
        # Find suitable relocation sites
        sites_query = db.query(RelocationSite).filter(
            RelocationSite.district == hab.district,
            RelocationSite.status == "available"
        )
        
        available_sites = []
        for site in sites_query.all():
            remaining_capacity = site.max_households - site.current_households
            if remaining_capacity >= hab.population_count:
                # Calculate distance (simplified - would use ST_Distance in production)
                available_sites.append({
                    "site_id": site.id,
                    "site_name": site.name,
                    "remaining_capacity": remaining_capacity,
                    "suitability_score": site.suitability_score,
                    "distance_to_town_km": site.distance_to_town_km,
                    "infrastructure_available": site.infrastructure_available
                })
        
        # Sort sites by suitability score
        available_sites.sort(key=lambda x: x["suitability_score"], reverse=True)
        
        # Get associated hazard zone
        hazard_zone = None
        if hab.hazard_zone_id:
            zone = db.query(HazardZone).filter(HazardZone.id == hab.hazard_zone_id).first()
            if zone:
                hazard_zone = {
                    "zone_id": zone.id,
                    "zone_name": zone.name,
                    "hazard_types": zone.hazard_types,
                    "risk_level": zone.risk_level
                }
        
        recommendations.append({
            "habitation_id": hab.id,
            "habitation_name": hab.name,
            "district": hab.district,
            "population": hab.population_count,
            "households": hab.household_count,
            "vulnerability_score": hab.vulnerability_score,
            "priority": hab.relocation_priority,
            "primary_hazards": [],  # Not in model, use empty array
            "hazard_zone": hazard_zone,
            "recommended_sites": available_sites[:3],  # Top 3 sites
            "urgency_level": _calculate_urgency_level(hab),
            "estimated_relocation_time_months": _estimate_relocation_time(hab)
        })
    
    return {
        "total_recommendations": len(recommendations),
        "recommendations": recommendations
    }


@router.post("/prioritization/calculate-scores")
def recalculate_vulnerability_scores(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Recalculate vulnerability scores for all habitations using AI-driven algorithm.
    Considers: hazard intensity, population, historical incidents, accessibility.
    Admin only.
    """
    habitations = db.query(VulnerableHabitation).all()
    updated_count = 0
    
    for hab in habitations:
        # Get associated hazard zone risk
        hazard_risk = 0.5  # default
        if hab.hazard_zone_id:
            zone = db.query(HazardZone).filter(HazardZone.id == hab.hazard_zone_id).first()
            if zone:
                hazard_risk = 0.8 if zone.risk_level == "critical" else 0.6 if zone.risk_level == "high" else 0.4
        
        # Calculate vulnerability score (0-1 scale)
        # Factors: hazard risk (50%), population size (30%), structural safety (10%), status (10%)
        population_factor = min(hab.population_count / 1000, 1.0) * 0.3  # Normalize to 1000
        
        # Use structural safety rating if available
        safety_factor = 0.0
        if hab.structural_safety_rating == "critical":
            safety_factor = 0.1
        elif hab.structural_safety_rating == "unsafe":
            safety_factor = 0.08
        elif hab.structural_safety_rating == "moderate":
            safety_factor = 0.05
            
        status_factor = 0.1 if hab.relocation_status == "not_started" else 0.05
        
        new_score = hazard_risk * 0.5 + population_factor + safety_factor + status_factor
        new_score = min(new_score, 1.0)
        
        # Update score
        hab.vulnerability_score = round(new_score, 2)
        
        # Auto-assign priority based on score
        if new_score >= 0.8:
            hab.relocation_priority = "immediate"
        elif new_score >= 0.6:
            hab.relocation_priority = "short_term"
        elif new_score >= 0.4:
            hab.relocation_priority = "medium_term"
        else:
            hab.relocation_priority = "long_term"
        
        updated_count += 1
    
    db.commit()
    
    return {
        "message": "Vulnerability scores recalculated successfully",
        "updated_habitations": updated_count
    }


@router.post("/prioritization/match-sites")
def auto_match_relocation_sites(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_admin_user),
    district: Optional[str] = None
):
    """
    Automatically match vulnerable habitations to suitable relocation sites.
    Uses AI-driven algorithm considering capacity, suitability, and distance.
    Admin only.
    """
    # Get habitations without assigned sites
    query = db.query(VulnerableHabitation).filter(
        VulnerableHabitation.assigned_relocation_site_id == None,
        VulnerableHabitation.relocation_priority.in_(["immediate", "short_term"])
    )
    
    if current_user.district or district:
        filter_district = district or current_user.district
        query = query.filter(VulnerableHabitation.district.ilike(f"%{filter_district}%"))
    
    habitations = query.order_by(VulnerableHabitation.vulnerability_score.desc()).all()
    
    matched_count = 0
    matches = []
    
    for hab in habitations:
        # Find best matching site in same district
        sites = db.query(RelocationSite).filter(
            RelocationSite.district == hab.district,
            RelocationSite.status == "available"
        ).all()
        
        best_site = None
        best_score = 0
        
        for site in sites:
            remaining_capacity = site.max_households - site.current_households
            
            if remaining_capacity >= hab.population_count:
                # Calculate match score
                capacity_score = min(remaining_capacity / hab.population_count, 2.0) / 2.0  # Prefer sites with adequate capacity
                suitability_score = site.suitability_score
                accessibility_score = site.accessibility_score
                
                match_score = (suitability_score * 0.5 + 
                             capacity_score * 0.3 + 
                             accessibility_score * 0.2)
                
                if match_score > best_score:
                    best_score = match_score
                    best_site = site
        
        if best_site:
            hab.assigned_relocation_site_id = best_site.id
            best_site.current_households += hab.population_count
            matched_count += 1
            
            matches.append({
                "habitation_id": hab.id,
                "habitation_name": hab.name,
                "population": hab.population_count,
                "site_id": best_site.id,
                "site_name": best_site.site_name,
                "match_score": round(best_score, 2)
            })
    
    db.commit()
    
    return {
        "message": f"Successfully matched {matched_count} habitations to relocation sites",
        "matched_count": matched_count,
        "matches": matches
    }


# ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

def _calculate_urgency_level(habitation: VulnerableHabitation) -> str:
    """Calculate urgency level based on multiple factors"""
    score = habitation.vulnerability_score
    
    if habitation.relocation_priority == "immediate" and score >= 0.8:
        return "CRITICAL"
    elif habitation.relocation_priority == "immediate" or score >= 0.7:
        return "HIGH"
    elif habitation.relocation_priority == "short_term" or score >= 0.5:
        return "MEDIUM"
    else:
        return "LOW"


def _estimate_relocation_time(habitation: VulnerableHabitation) -> int:
    """Estimate relocation time in months based on population and complexity"""
    base_months = 6  # Base planning time
    
    # Add time based on population
    if habitation.population_count > 500:
        base_months += 6
    elif habitation.population_count > 200:
        base_months += 3
    
    # Add time based on zone risk level
    if habitation.hazard_zone_id:
        zone = db.query(HazardZone).filter(HazardZone.id == habitation.hazard_zone_id).first()
        if zone and zone.risk_level == "critical":
            base_months -= 3  # More urgent
        elif zone and zone.risk_level == "high":
            base_months -= 1
    
    return base_months
