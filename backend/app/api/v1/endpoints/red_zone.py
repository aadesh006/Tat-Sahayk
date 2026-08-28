"""
Red Zone Management API Endpoints
Handles hazard zones, relocation sites, vulnerable habitations, spatial analysis, and SDMA dashboard
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from geoalchemy2.shape import from_shape, to_shape
from geoalchemy2.functions import ST_DWithin
from geoalchemy2.types import Geography
from shapely.geometry import shape, mapping, Point
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.red_zone import HazardZone, RelocationSite, VulnerableHabitation
from app.models.report import Report
from app.schemas.red_zone import (
    HazardZoneCreate, HazardZoneUpdate, HazardZoneResponse,
    RelocationSiteCreate, RelocationSiteUpdate, RelocationSiteResponse,
    VulnerableHabitationCreate, VulnerableHabitationUpdate, VulnerableHabitationResponse,
    HabitationsAtRiskResponse, NearbySitesResponse,
    SDMAStatsResponse, SDMASummaryResponse,
    GeoJSONFeature, GeoJSONFeatureCollection,
    AIAssessmentResponse
)
from app.services.red_zone_ai import (
    assess_habitation_priority,
    assess_relocation_site,
    generate_sdma_summary
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== HAZARD ZONES ENDPOINTS ====================

@router.get("/hazard-zones/", response_model=List[HazardZoneResponse])
def get_hazard_zones(
    active_only: bool = True,
    district: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all hazard zones with district filtering for district admins"""
    query = db.query(HazardZone)
    
    if active_only:
        query = query.filter(HazardZone.is_active == True)
    
    # District filtering for district admins
    if current_user.role == "admin" and current_user.district:
        query = query.filter(HazardZone.district.ilike(f"%{current_user.district}%"))
    elif district:
        query = query.filter(HazardZone.district.ilike(f"%{district}%"))
    
    zones = query.order_by(HazardZone.created_at.desc()).all()
    
    # Convert PostGIS boundary to GeoJSON
    result = []
    for zone in zones:
        zone_dict = {
            "id": zone.id,
            "name": zone.name,
            "district": zone.district,
            "state": zone.state,
            "hazard_types": zone.hazard_types or [],
            "intensity": zone.intensity,
            "boundary": None,
            "center_lat": zone.center_lat,
            "center_lon": zone.center_lon,
            "population_at_risk": zone.population_at_risk,
            "affected_area_sqkm": zone.affected_area_sqkm,
            "ai_confidence": zone.ai_confidence,
            "ai_reasoning": zone.ai_reasoning,
            "source": zone.source,
            "is_active": zone.is_active,
            "last_incident_date": zone.last_incident_date,
            "created_by": zone.created_by,
            "created_at": zone.created_at,
            "updated_at": zone.updated_at
        }
        
        if zone.boundary:
            try:
                geom = to_shape(zone.boundary)
                zone_dict["boundary"] = mapping(geom)
            except:
                pass
        
        result.append(HazardZoneResponse(**zone_dict))
    
    return result


@router.post("/hazard-zones/", response_model=HazardZoneResponse)
def create_hazard_zone(
    zone_data: HazardZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new hazard zone (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # District check for district admins
    if current_user.district and zone_data.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail="Can only create zones in your district")
    
    new_zone = HazardZone(
        name=zone_data.name,
        district=zone_data.district,
        state=zone_data.state,
        hazard_types=zone_data.hazard_types,
        intensity=zone_data.intensity,
        center_lat=zone_data.center_lat,
        center_lon=zone_data.center_lon,
        population_at_risk=zone_data.population_at_risk,
        affected_area_sqkm=zone_data.affected_area_sqkm,
        last_incident_date=zone_data.last_incident_date,
        source="manual",
        created_by=current_user.id
    )
    
    # Handle GeoJSON boundary if provided
    if zone_data.boundary:
        try:
            geom = shape(zone_data.boundary)
            new_zone.boundary = from_shape(geom, srid=4326)
            # Auto-compute center if not provided
            if not zone_data.center_lat or not zone_data.center_lon:
                centroid = geom.centroid
                new_zone.center_lat = centroid.y
                new_zone.center_lon = centroid.x
        except Exception as e:
            logger.error(f"GeoJSON parsing error: {e}")
            raise HTTPException(status_code=400, detail="Invalid GeoJSON boundary")
    
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)
    
    # Convert boundary back to GeoJSON for response
    response_data = {
        **zone_data.model_dump(),
        "id": new_zone.id,
        "ai_confidence": 0.0,
        "ai_reasoning": None,
        "source": "manual",
        "is_active": True,
        "created_by": current_user.id,
        "created_at": new_zone.created_at,
        "updated_at": None
    }
    
    return HazardZoneResponse(**response_data)


@router.get("/hazard-zones/{zone_id}", response_model=HazardZoneResponse)
def get_hazard_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single hazard zone with full details"""
    zone = db.query(HazardZone).filter(HazardZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hazard zone not found")
    
    # District filtering
    if current_user.role == "admin" and current_user.district:
        if zone.district.lower() != current_user.district.lower():
            raise HTTPException(status_code=403, detail="Access denied")
    
    zone_dict = {
        "id": zone.id,
        "name": zone.name,
        "district": zone.district,
        "state": zone.state,
        "hazard_types": zone.hazard_types or [],
        "intensity": zone.intensity,
        "boundary": None,
        "center_lat": zone.center_lat,
        "center_lon": zone.center_lon,
        "population_at_risk": zone.population_at_risk,
        "affected_area_sqkm": zone.affected_area_sqkm,
        "ai_confidence": zone.ai_confidence,
        "ai_reasoning": zone.ai_reasoning,
        "source": zone.source,
        "is_active": zone.is_active,
        "last_incident_date": zone.last_incident_date,
        "created_by": zone.created_by,
        "created_at": zone.created_at,
        "updated_at": zone.updated_at
    }
    
    if zone.boundary:
        try:
            geom = to_shape(zone.boundary)
            zone_dict["boundary"] = mapping(geom)
        except:
            pass
    
    return HazardZoneResponse(**zone_dict)


@router.put("/hazard-zones/{zone_id}", response_model=HazardZoneResponse)
def update_hazard_zone(
    zone_id: int,
    zone_update: HazardZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update hazard zone (admin only, own district)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    zone = db.query(HazardZone).filter(HazardZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hazard zone not found")
    
    # District check
    if current_user.district and zone.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail="Can only update zones in your district")
    
    # Update fields
    for field, value in zone_update.model_dump(exclude_unset=True).items():
        if field == "boundary" and value:
            try:
                geom = shape(value)
                setattr(zone, "boundary", from_shape(geom, srid=4326))
                # Update center
                centroid = geom.centroid
                zone.center_lat = centroid.y
                zone.center_lon = centroid.x
            except Exception as e:
                logger.error(f"GeoJSON parsing error: {e}")
                raise HTTPException(status_code=400, detail="Invalid GeoJSON boundary")
        else:
            setattr(zone, field, value)
    
    zone.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(zone)
    
    return get_hazard_zone(zone_id, db, current_user)


@router.delete("/hazard-zones/{zone_id}")
def delete_hazard_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete hazard zone (admin only, own district)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    zone = db.query(HazardZone).filter(HazardZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Hazard zone not found")
    
    # District check
    if current_user.district and zone.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail="Can only delete zones in your district")
    
    db.delete(zone)
    db.commit()
    
    return {"message": "Hazard zone deleted successfully"}


# ==================== RELOCATION SITES ENDPOINTS ====================

@router.get("/sites/", response_model=List[RelocationSiteResponse])
def get_relocation_sites(
    active_only: bool = True,
    district: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all relocation sites"""
    query = db.query(RelocationSite)
    
    if active_only:
        query = query.filter(RelocationSite.is_active == True)
    
    # District filtering
    if current_user.role == "admin" and current_user.district:
        query = query.filter(RelocationSite.district.ilike(f"%{current_user.district}%"))
    elif district:
        query = query.filter(RelocationSite.district.ilike(f"%{district}%"))
    
    sites = query.order_by(RelocationSite.created_at.desc()).all()
    return sites


@router.post("/sites/", response_model=RelocationSiteResponse)
def create_relocation_site(
    site_data: RelocationSiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new relocation site (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # District check
    if current_user.district and site_data.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail="Can only create sites in your district")
    
    # Create PostGIS point
    point = Point(site_data.longitude, site_data.latitude)
    
    new_site = RelocationSite(
        name=site_data.name,
        district=site_data.district,
        state=site_data.state,
        location=from_shape(point, srid=4326),
        latitude=site_data.latitude,
        longitude=site_data.longitude,
        carrying_capacity=site_data.carrying_capacity,
        current_occupancy=site_data.current_occupancy,
        available_capacity=site_data.carrying_capacity - site_data.current_occupancy,
        facilities=site_data.facilities,
        hazard_free_radius_km=site_data.hazard_free_radius_km,
        land_area_sqkm=site_data.land_area_sqkm,
        created_by=current_user.id
    )
    
    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    
    return new_site


@router.get("/sites/{site_id}", response_model=RelocationSiteResponse)
def get_relocation_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single relocation site"""
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
    
    return site


@router.put("/sites/{site_id}", response_model=RelocationSiteResponse)
def update_relocation_site(
    site_id: int,
    site_update: RelocationSiteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update relocation site (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
    
    # District check
    if current_user.district and site.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail="Can only update sites in your district")
    
    # Update fields
    for field, value in site_update.model_dump(exclude_unset=True).items():
        if field in ["latitude", "longitude"]:
            if site_update.latitude and site_update.longitude:
                point = Point(site_update.longitude, site_update.latitude)
                site.location = from_shape(point, srid=4326)
                site.latitude = site_update.latitude
                site.longitude = site_update.longitude
        else:
            setattr(site, field, value)
    
    # Recalculate available capacity
    site.available_capacity = site.carrying_capacity - site.current_occupancy
    
    db.commit()
    db.refresh(site)
    
    return site


@router.delete("/sites/{site_id}")
def delete_relocation_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete relocation site (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
    
    # District check
    if current_user.district and site.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail="Can only delete sites in your district")
    
    db.delete(site)
    db.commit()
    
    return {"message": "Relocation site deleted successfully"}


@router.post("/sites/{site_id}/assess", response_model=AIAssessmentResponse)
def assess_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run AI suitability assessment on relocation site"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Relocation site not found")
    
    # Find nearby hazard zones (within 20km)
    nearby_zones = db.execute(
        text("""
            SELECT id, name, district, intensity, hazard_types, 
                   ST_Distance(location::geography, 
                               ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) / 1000 as distance_km
            FROM hazard_zones
            WHERE is_active = true
              AND ST_DWithin(location::geography, 
                             ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 
                             20000)
            ORDER BY distance_km
            LIMIT 5
        """),
        {"lat": site.latitude, "lon": site.longitude}
    ).fetchall()
    
    nearby_zones_data = [
        {
            "id": z[0],
            "name": z[1],
            "district": z[2],
            "intensity": z[3],
            "hazard_types": z[4],
            "distance_km": round(z[5], 2)
        }
        for z in nearby_zones
    ]
    
    site_data = {
        "name": site.name,
        "district": site.district,
        "state": site.state,
        "latitude": site.latitude,
        "longitude": site.longitude,
        "carrying_capacity": site.carrying_capacity,
        "facilities": site.facilities or [],
        "hazard_free_radius_km": site.hazard_free_radius_km
    }
    
    assessment = assess_relocation_site(site_data, nearby_zones_data)
    
    # Update site with assessment
    site.suitability_score = assessment.get("suitability_score", 0.5)
    site.ai_assessment = assessment.get("reasoning", "")
    if assessment.get("recommended_capacity_households"):
        site.carrying_capacity = assessment["recommended_capacity_households"]
        site.available_capacity = site.carrying_capacity - site.current_occupancy
    
    db.commit()
    db.refresh(site)
    
    return AIAssessmentResponse(
        success=True,
        message="AI assessment completed",
        assessment=assessment,
        updated_fields={
            "suitability_score": site.suitability_score,
            "carrying_capacity": site.carrying_capacity
        }
    )


# ==================== VULNERABLE HABITATIONS ENDPOINTS ====================

@router.get("/habitations/", response_model=List[VulnerableHabitationResponse])
def get_vulnerable_habitations(
    priority: Optional[str] = None,
    district: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all vulnerable habitations (priority-sorted, district-filtered)"""
    query = db.query(VulnerableHabitation)
    
    # Priority order for sorting
    priority_order = {
        "IMMEDIATE": 1,
        "SHORT_TERM": 2,
        "MEDIUM_TERM": 3,
        "SAFE": 4
    }
    
    if priority:
        query = query.filter(VulnerableHabitation.priority == priority)
    
    # District filtering
    if current_user.role == "admin" and current_user.district:
        query = query.filter(VulnerableHabitation.district.ilike(f"%{current_user.district}%"))
    elif district:
        query = query.filter(VulnerableHabitation.district.ilike(f"%{district}%"))
    
    habitations = query.all()
    
    # Sort by priority
    habitations.sort(key=lambda h: priority_order.get(h.priority, 99))
    
    return habitations


@router.post("/habitations/", response_model=VulnerableHabitationResponse)
def create_vulnerable_habitation(
    habitation_data: VulnerableHabitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a new vulnerable habitation"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # District check
    if current_user.district and habitation_data.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail="Can only register habitations in your district")
    
    # Create PostGIS point
    point = Point(habitation_data.longitude, habitation_data.latitude)
    
    new_habitation = VulnerableHabitation(
        name=habitation_data.name,
        district=habitation_data.district,
        state=habitation_data.state,
        location=from_shape(point, srid=4326),
        latitude=habitation_data.latitude,
        longitude=habitation_data.longitude,
        population=habitation_data.population,
        households=habitation_data.households,
        hazard_types=habitation_data.hazard_types,
        created_by=current_user.id
    )
    
    db.add(new_habitation)
    db.commit()
    db.refresh(new_habitation)
    
    return new_habitation


@router.get("/habitations/{habitation_id}", response_model=VulnerableHabitationResponse)
def get_vulnerable_habitation(
    habitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get vulnerable habitation with full AI assessment"""
    habitation = db.query(VulnerableHabitation).filter(
        VulnerableHabitation.id == habitation_id
    ).first()
    
    if not habitation:
        raise HTTPException(status_code=404, detail="Habitation not found")
    
    return habitation


@router.put("/habitations/{habitation_id}", response_model=VulnerableHabitationResponse)
def update_vulnerable_habitation(
    habitation_id: int,
    habitation_update: VulnerableHabitationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update vulnerable habitation (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    habitation = db.query(VulnerableHabitation).filter(
        VulnerableHabitation.id == habitation_id
    ).first()
    
    if not habitation:
        raise HTTPException(status_code=404, detail="Habitation not found")
    
    # District check
    if current_user.district and habitation.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail="Can only update habitations in your district")
    
    # Update fields
    for field, value in habitation_update.model_dump(exclude_unset=True).items():
        if field in ["latitude", "longitude"]:
            if habitation_update.latitude and habitation_update.longitude:
                point = Point(habitation_update.longitude, habitation_update.latitude)
                habitation.location = from_shape(point, srid=4326)
                habitation.latitude = habitation_update.latitude
                habitation.longitude = habitation_update.longitude
        else:
            setattr(habitation, field, value)
    
    db.commit()
    db.refresh(habitation)
    
    return habitation


@router.delete("/habitations/{habitation_id}")
def delete_vulnerable_habitation(
    habitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete vulnerable habitation (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    habitation = db.query(VulnerableHabitation).filter(
        VulnerableHabitation.id == habitation_id
    ).first()
    
    if not habitation:
        raise HTTPException(status_code=404, detail="Habitation not found")
    
    # District check
    if current_user.district and habitation.district.lower() != current_user.district.lower():
        raise HTTPException(status_code=403, detail="Can only delete habitations in your district")
    
    db.delete(habitation)
    db.commit()
    
    return {"message": "Vulnerable habitation deleted successfully"}


@router.post("/habitations/{habitation_id}/assess", response_model=AIAssessmentResponse)
def assess_habitation(
    habitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run AI priority assessment on vulnerable habitation"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    habitation = db.query(VulnerableHabitation).filter(
        VulnerableHabitation.id == habitation_id
    ).first()
    
    if not habitation:
        raise HTTPException(status_code=404, detail="Habitation not found")
    
    # Find nearby hazard zones (within 10km)
    nearby_zones = db.execute(
        text("""
            SELECT id, name, district, intensity, hazard_types, population_at_risk,
                   ST_Distance(boundary::geography, 
                               ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) / 1000 as distance_km
            FROM hazard_zones
            WHERE is_active = true
              AND ST_DWithin(boundary::geography, 
                             ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 
                             10000)
            ORDER BY distance_km
            LIMIT 5
        """),
        {"lat": habitation.latitude, "lon": habitation.longitude}
    ).fetchall()
    
    nearby_zones_data = [
        {
            "id": z[0],
            "name": z[1],
            "district": z[2],
            "intensity": z[3],
            "hazard_types": z[4],
            "population_at_risk": z[5],
            "distance_km": round(z[6], 2)
        }
        for z in nearby_zones
    ]
    
    # Get recent disaster reports in area (within 5km, last 2 years)
    two_years_ago = datetime.utcnow() - timedelta(days=730)
    recent_reports = db.execute(
        text("""
            SELECT id, hazard_type, severity, description, status
            FROM reports
            WHERE status = 'verified'
              AND created_at >= :since
              AND ST_DWithin(location::geography, 
                             ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 
                             5000)
            ORDER BY created_at DESC
            LIMIT 10
        """),
        {"lat": habitation.latitude, "lon": habitation.longitude, "since": two_years_ago}
    ).fetchall()
    
    recent_reports_data = [
        {
            "id": r[0],
            "hazard_type": r[1],
            "severity": r[2],
            "description": r[3][:100] if r[3] else "",
            "status": r[4]
        }
        for r in recent_reports
    ]
    
    # Get available relocation sites
    available_sites = db.query(RelocationSite).filter(
        RelocationSite.is_active == True,
        RelocationSite.available_capacity > 0
    ).limit(5).all()
    
    available_sites_data = [
        {
            "id": s.id,
            "name": s.name,
            "district": s.district,
            "available_capacity": s.available_capacity,
            "suitability_score": s.suitability_score,
            "facilities": s.facilities or []
        }
        for s in available_sites
    ]
    
    habitation_data = {
        "name": habitation.name,
        "district": habitation.district,
        "state": habitation.state,
        "population": habitation.population,
        "households": habitation.households,
        "hazard_types": habitation.hazard_types or [],
        "exposure_score": habitation.exposure_score
    }
    
    assessment = assess_habitation_priority(
        habitation_data,
        nearby_zones_data,
        recent_reports_data,
        available_sites_data
    )
    
    # Update habitation with assessment
    habitation.priority = assessment.get("priority", "MEDIUM_TERM")
    habitation.vulnerability_score = assessment.get("vulnerability_score", 0.5)
    habitation.priority_reason = assessment.get("urgency_reason", "")
    habitation.estimated_timeline_months = assessment.get("estimated_timeline_months", 12)
    habitation.recommended_site_id = assessment.get("recommended_site_id")
    habitation.ai_assessment = str(assessment)
    habitation.last_assessed = datetime.utcnow()
    
    # Update nearest hazard zone if found
    if nearby_zones_data:
        habitation.nearest_hazard_zone_id = nearby_zones_data[0]["id"]
    
    db.commit()
    db.refresh(habitation)
    
    return AIAssessmentResponse(
        success=True,
        message="AI assessment completed",
        assessment=assessment,
        updated_fields={
            "priority": habitation.priority,
            "vulnerability_score": habitation.vulnerability_score,
            "estimated_timeline_months": habitation.estimated_timeline_months
        }
    )


@router.post("/habitations/bulk-assess")
def bulk_assess_habitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run spatial analysis + AI on all habitations in district"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = db.query(VulnerableHabitation)
    
    # District filtering
    if current_user.district:
        query = query.filter(VulnerableHabitation.district.ilike(f"%{current_user.district}%"))
    
    habitations = query.all()
    
    assessed_count = 0
    for habitation in habitations:
        try:
            # Calculate exposure score based on proximity to hazard zones
            nearby_count = db.execute(
                text("""
                    SELECT COUNT(*)
                    FROM hazard_zones
                    WHERE is_active = true
                      AND ST_DWithin(boundary::geography, 
                                     ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 
                                     5000)
                """),
                {"lat": habitation.latitude, "lon": habitation.longitude}
            ).scalar()
            
            # Simple exposure scoring
            habitation.exposure_score = min(1.0, nearby_count * 0.3)
            assessed_count += 1
        except Exception as e:
            logger.error(f"Error assessing habitation {habitation.id}: {e}")
            continue
    
    db.commit()
    
    return {
        "message": f"Bulk assessment completed",
        "assessed_count": assessed_count,
        "total_habitations": len(habitations)
    }


# ==================== SPATIAL ANALYSIS ENDPOINTS ====================

@router.get("/spatial/habitations-at-risk")
def get_habitations_at_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """PostGIS: habitations within Red Zone radius"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    district_filter = ""
    if current_user.district:
        district_filter = f"AND h.district ILIKE '%{current_user.district}%'"
    
    results = db.execute(
        text(f"""
            SELECT 
                h.id as habitation_id,
                h.name as habitation_name,
                h.district,
                h.population,
                z.id as hazard_zone_id,
                z.name as hazard_zone_name,
                ST_Distance(h.location::geography, z.boundary::geography) / 1000 as distance_km,
                h.priority
            FROM vulnerable_habitations h
            JOIN hazard_zones z ON z.is_active = true
            WHERE ST_DWithin(h.location::geography, z.boundary::geography, 2000)
              {district_filter}
            ORDER BY distance_km
        """)
    ).fetchall()
    
    return [
        {
            "habitation_id": r[0],
            "habitation_name": r[1],
            "district": r[2],
            "population": r[3],
            "hazard_zone_id": r[4],
            "hazard_zone_name": r[5],
            "distance_km": round(r[6], 2),
            "priority": r[7]
        }
        for r in results
    ]


@router.get("/spatial/nearby-sites")
def get_nearby_sites(
    habitation_id: int,
    max_distance_km: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Find nearest relocation sites with capacity for a habitation"""
    habitation = db.query(VulnerableHabitation).filter(
        VulnerableHabitation.id == habitation_id
    ).first()
    
    if not habitation:
        raise HTTPException(status_code=404, detail="Habitation not found")
    
    results = db.execute(
        text("""
            SELECT 
                id, name, district,
                ST_Distance(location::geography, 
                            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) / 1000 as distance_km,
                available_capacity,
                suitability_score,
                facilities
            FROM relocation_sites
            WHERE is_active = true
              AND available_capacity > 0
              AND ST_DWithin(location::geography, 
                             ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 
                             :max_distance)
            ORDER BY distance_km
            LIMIT 10
        """),
        {"lat": habitation.latitude, "lon": habitation.longitude, "max_distance": max_distance_km * 1000}
    ).fetchall()
    
    return [
        {
            "site_id": r[0],
            "site_name": r[1],
            "district": r[2],
            "distance_km": round(r[3], 2),
            "available_capacity": r[4],
            "suitability_score": r[5],
            "facilities": r[6] or []
        }
        for r in results
    ]


@router.post("/spatial/update-exposure")
def update_exposure_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run PostGIS exposure scoring for all habitations"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    habitations = db.query(VulnerableHabitation).all()
    
    updated_count = 0
    for habitation in habitations:
        try:
            # Count hazard zones within 5km
            nearby_zones = db.execute(
                text("""
                    SELECT COUNT(*), 
                           AVG(CASE intensity 
                               WHEN 'critical' THEN 1.0
                               WHEN 'high' THEN 0.75
                               WHEN 'medium' THEN 0.5
                               ELSE 0.25
                           END) as avg_intensity
                    FROM hazard_zones
                    WHERE is_active = true
                      AND ST_DWithin(boundary::geography, 
                                     ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, 
                                     5000)
                """),
                {"lat": habitation.latitude, "lon": habitation.longitude}
            ).fetchone()
            
            zone_count = nearby_zones[0]
            avg_intensity = nearby_zones[1] or 0.0
            
            # Calculate exposure score (0-1)
            habitation.exposure_score = min(1.0, (zone_count * 0.2) + (avg_intensity * 0.5))
            updated_count += 1
        except Exception as e:
            logger.error(f"Error updating exposure for habitation {habitation.id}: {e}")
            continue
    
    db.commit()
    
    return {
        "message": "Exposure scores updated",
        "updated_count": updated_count,
        "total_habitations": len(habitations)
    }


# ==================== SDMA DASHBOARD ENDPOINTS ====================

@router.get("/sdma/stats", response_model=SDMAStatsResponse)
def get_sdma_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Statistics for SDMA dashboard"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Apply district filtering
    zone_query = db.query(HazardZone).filter(HazardZone.is_active == True)
    hab_query = db.query(VulnerableHabitation)
    site_query = db.query(RelocationSite).filter(RelocationSite.is_active == True)
    
    if current_user.district:
        zone_query = zone_query.filter(HazardZone.district.ilike(f"%{current_user.district}%"))
        hab_query = hab_query.filter(VulnerableHabitation.district.ilike(f"%{current_user.district}%"))
        site_query = site_query.filter(RelocationSite.district.ilike(f"%{current_user.district}%"))
    
    zones = zone_query.all()
    habitations = hab_query.all()
    sites = site_query.all()
    
    total_population_at_risk = sum(h.population for h in habitations)
    immediate_count = len([h for h in habitations if h.priority == "IMMEDIATE"])
    short_term_count = len([h for h in habitations if h.priority == "SHORT_TERM"])
    medium_term_count = len([h for h in habitations if h.priority == "MEDIUM_TERM"])
    safe_count = len([h for h in habitations if h.priority == "SAFE"])
    
    total_site_capacity = sum(s.carrying_capacity for s in sites)
    total_site_occupancy = sum(s.current_occupancy for s in sites)
    total_households = sum(h.households for h in habitations)
    capacity_gap = max(0, total_households - (total_site_capacity - total_site_occupancy))
    
    return SDMAStatsResponse(
        active_red_zones=len(zones),
        total_population_at_risk=total_population_at_risk,
        total_habitations=len(habitations),
        immediate_priority_count=immediate_count,
        short_term_priority_count=short_term_count,
        medium_term_priority_count=medium_term_count,
        safe_count=safe_count,
        total_relocation_sites=len(sites),
        total_site_capacity=total_site_capacity,
        total_site_occupancy=total_site_occupancy,
        capacity_gap=capacity_gap
    )


@router.get("/sdma/summary", response_model=SDMASummaryResponse)
def get_sdma_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI-generated executive summary for SDMA authorities"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Apply district filtering
    zone_query = db.query(HazardZone).filter(HazardZone.is_active == True)
    hab_query = db.query(VulnerableHabitation)
    site_query = db.query(RelocationSite).filter(RelocationSite.is_active == True)
    
    if current_user.district:
        zone_query = zone_query.filter(HazardZone.district.ilike(f"%{current_user.district}%"))
        hab_query = hab_query.filter(VulnerableHabitation.district.ilike(f"%{current_user.district}%"))
        site_query = site_query.filter(RelocationSite.district.ilike(f"%{current_user.district}%"))
    
    zones = zone_query.all()
    habitations = hab_query.all()
    sites = site_query.all()
    
    # Convert to dicts for AI
    zones_data = [
        {
            "id": z.id,
            "name": z.name,
            "district": z.district,
            "intensity": z.intensity,
            "population_at_risk": z.population_at_risk,
            "hazard_types": z.hazard_types or []
        }
        for z in zones
    ]
    
    habitations_data = [
        {
            "id": h.id,
            "name": h.name,
            "district": h.district,
            "population": h.population,
            "households": h.households,
            "priority": h.priority,
            "priority_reason": h.priority_reason
        }
        for h in habitations
    ]
    
    sites_data = [
        {
            "id": s.id,
            "name": s.name,
            "district": s.district,
            "available_capacity": s.available_capacity,
            "suitability_score": s.suitability_score
        }
        for s in sites
    ]
    
    summary = generate_sdma_summary(zones_data, habitations_data, sites_data)
    
    return SDMASummaryResponse(**summary)


@router.get("/sdma/report")
def get_sdma_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Full data for PDF/print report"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    stats = get_sdma_stats(db, current_user)
    summary = get_sdma_summary(db, current_user)
    
    # Get top priority habitations
    hab_query = db.query(VulnerableHabitation).filter(
        VulnerableHabitation.priority.in_(["IMMEDIATE", "SHORT_TERM"])
    )
    
    if current_user.district:
        hab_query = hab_query.filter(
            VulnerableHabitation.district.ilike(f"%{current_user.district}%")
        )
    
    priority_habitations = hab_query.all()
    
    return {
        "stats": stats,
        "summary": summary,
        "priority_habitations": priority_habitations,
        "generated_at": datetime.utcnow().isoformat()
    }


# ==================== MAP DATA ENDPOINTS ====================

@router.get("/map/zones", response_model=GeoJSONFeatureCollection)
def get_zones_geojson(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """GeoJSON FeatureCollection of all active hazard zones"""
    query = db.query(HazardZone).filter(HazardZone.is_active == True)
    
    # District filtering
    if current_user.role == "admin" and current_user.district:
        query = query.filter(HazardZone.district.ilike(f"%{current_user.district}%"))
    
    zones = query.all()
    
    features = []
    for zone in zones:
        if zone.boundary:
            try:
                geom = to_shape(zone.boundary)
                feature = GeoJSONFeature(
                    type="Feature",
                    geometry=mapping(geom),
                    properties={
                        "id": zone.id,
                        "name": zone.name,
                        "district": zone.district,
                        "state": zone.state,
                        "intensity": zone.intensity,
                        "hazard_types": zone.hazard_types or [],
                        "population_at_risk": zone.population_at_risk,
                        "ai_confidence": zone.ai_confidence,
                        "source": zone.source
                    }
                )
                features.append(feature)
            except:
                continue
    
    return GeoJSONFeatureCollection(type="FeatureCollection", features=features)


@router.get("/map/habitations", response_model=GeoJSONFeatureCollection)
def get_habitations_geojson(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """All habitations as GeoJSON points"""
    query = db.query(VulnerableHabitation)
    
    # District filtering
    if current_user.role == "admin" and current_user.district:
        query = query.filter(VulnerableHabitation.district.ilike(f"%{current_user.district}%"))
    
    habitations = query.all()
    
    features = []
    for h in habitations:
        feature = GeoJSONFeature(
            type="Feature",
            geometry={
                "type": "Point",
                "coordinates": [h.longitude, h.latitude]
            },
            properties={
                "id": h.id,
                "name": h.name,
                "district": h.district,
                "state": h.state,
                "population": h.population,
                "households": h.households,
                "priority": h.priority,
                "priority_reason": h.priority_reason,
                "vulnerability_score": h.vulnerability_score
            }
        )
        features.append(feature)
    
    return GeoJSONFeatureCollection(type="FeatureCollection", features=features)


@router.get("/map/sites", response_model=GeoJSONFeatureCollection)
def get_sites_geojson(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """All relocation sites as GeoJSON points"""
    query = db.query(RelocationSite).filter(RelocationSite.is_active == True)
    
    # District filtering
    if current_user.role == "admin" and current_user.district:
        query = query.filter(RelocationSite.district.ilike(f"%{current_user.district}%"))
    
    sites = query.all()
    
    features = []
    for s in sites:
        feature = GeoJSONFeature(
            type="Feature",
            geometry={
                "type": "Point",
                "coordinates": [s.longitude, s.latitude]
            },
            properties={
                "id": s.id,
                "name": s.name,
                "district": s.district,
                "state": s.state,
                "carrying_capacity": s.carrying_capacity,
                "current_occupancy": s.current_occupancy,
                "available_capacity": s.available_capacity,
                "suitability_score": s.suitability_score,
                "facilities": s.facilities or []
            }
        )
        features.append(feature)
    
    return GeoJSONFeatureCollection(type="FeatureCollection", features=features)
