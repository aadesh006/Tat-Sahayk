"""
Citizen Alert Service
Provides location-based automated alerts for citizens
Recommends safe sites and shows nearby red zones
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_

from app.models.red_zone import HazardZone, RelocationSite
from app.models.alert import Alert

logger = logging.getLogger(__name__)


def get_location_based_alerts(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 50.0
) -> Dict[str, Any]:
    """
    Get all relevant information for a citizen at a specific location.
    Returns red zones, safe sites, active alerts, and safety recommendations.
    
    Args:
        db: Database session
        latitude: Citizen's current latitude
        longitude: Citizen's current longitude
        radius_km: Search radius for alerts and zones
        
    Returns:
        Comprehensive alert package with all relevant info
    """
    try:
        logger.info(f"Fetching location-based alerts for ({latitude:.4f}, {longitude:.4f})")
        
        # 1. Check if citizen is inside any active red zone
        inside_zone = check_if_in_red_zone(db, latitude, longitude)
        
        # 2. Find nearby red zones
        nearby_zones = find_nearby_red_zones(db, latitude, longitude, radius_km)
        
        # 3. Find nearest safe relocation sites
        safe_sites = find_nearest_safe_sites(db, latitude, longitude, max_sites=5)
        
        # 4. Get active admin alerts for the area
        admin_alerts = get_active_admin_alerts(db, latitude, longitude, radius_km)
        
        # 5. Calculate safety status and recommendations
        safety_status = calculate_safety_status(inside_zone, nearby_zones)
        
        # 6. Generate evacuation recommendation if needed
        evacuation_recommendation = None
        if safety_status["level"] in ["critical", "high"]:
            evacuation_recommendation = generate_evacuation_recommendation(
                db, latitude, longitude, inside_zone, nearby_zones, safe_sites
            )
        
        response = {
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            "safety_status": safety_status,
            "inside_red_zone": inside_zone is not None,
            "red_zone_details": format_zone_details(inside_zone) if inside_zone else None,
            "nearby_red_zones": [format_zone_details(z) for z in nearby_zones],
            "nearest_safe_sites": [format_site_details(s) for s in safe_sites],
            "admin_alerts": [format_admin_alert(a) for a in admin_alerts],
            "evacuation_recommendation": evacuation_recommendation,
            "emergency_contacts": {
                "emergency": "112",
                "disaster_helpline": "1078",
                "ndrf": "9711077372"
            }
        }
        
        logger.info(
            f"Generated alert package: {safety_status['level']} safety level, "
            f"{len(nearby_zones)} zones, {len(safe_sites)} sites, {len(admin_alerts)} alerts"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting location-based alerts: {e}")
        return {
            "error": "Failed to fetch location alerts",
            "location": {"latitude": latitude, "longitude": longitude}
        }


def check_if_in_red_zone(
    db: Session,
    latitude: float,
    longitude: float
) -> Optional[HazardZone]:
    """
    Check if a location is inside any active red zone.
    Uses PostGIS ST_Contains for accurate polygon containment.
    """
    try:
        query = text("""
            SELECT id FROM hazard_zones
            WHERE is_active = true
            AND ST_Contains(
                boundary,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
            )
            ORDER BY intensity DESC
            LIMIT 1
        """)
        
        result = db.execute(query, {"lat": latitude, "lon": longitude}).fetchone()
        
        if result:
            zone = db.query(HazardZone).filter(HazardZone.id == result.id).first()
            if zone:
                logger.warning(f"⚠️ Citizen is INSIDE red zone #{zone.id}: {zone.name}")
            return zone
        
        return None
        
    except Exception as e:
        logger.error(f"Error checking if in red zone: {e}")
        return None


def find_nearby_red_zones(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 50.0
) -> List[HazardZone]:
    """
    Find all active red zones within radius.
    Orders by distance (closest first).
    """
    try:
        query = text("""
            SELECT 
                id,
                ST_Distance(
                    boundary::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                ) / 1000 as distance_km
            FROM hazard_zones
            WHERE 
                is_active = true
                AND ST_DWithin(
                    boundary::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                    :radius_meters
                )
            ORDER BY distance_km ASC
            LIMIT 10
        """)
        
        results = db.execute(
            query,
            {
                "lat": latitude,
                "lon": longitude,
                "radius_meters": radius_km * 1000
            }
        ).fetchall()
        
        zone_ids = [r.id for r in results]
        zones = db.query(HazardZone).filter(HazardZone.id.in_(zone_ids)).all() if zone_ids else []
        
        # Add distance to each zone
        distance_map = {r.id: r.distance_km for r in results}
        for zone in zones:
            zone.distance_km = distance_map.get(zone.id, 0)
        
        return zones
        
    except Exception as e:
        logger.error(f"Error finding nearby red zones: {e}")
        return []


def find_nearest_safe_sites(
    db: Session,
    latitude: float,
    longitude: float,
    max_sites: int = 5
) -> List[RelocationSite]:
    """
    Find nearest safe relocation sites with available capacity.
    """
    try:
        query = text("""
            SELECT 
                id,
                ST_Distance(
                    location::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                ) / 1000 as distance_km
            FROM relocation_sites
            WHERE 
                is_active = true
                AND available_capacity > 0
            ORDER BY distance_km ASC
            LIMIT :max_sites
        """)
        
        results = db.execute(
            query,
            {
                "lat": latitude,
                "lon": longitude,
                "max_sites": max_sites
            }
        ).fetchall()
        
        site_ids = [r.id for r in results]
        sites = db.query(RelocationSite).filter(RelocationSite.id.in_(site_ids)).all() if site_ids else []
        
        # Add distance to each site
        distance_map = {r.id: r.distance_km for r in results}
        for site in sites:
            site.distance_km = distance_map.get(site.id, 0)
        
        return sites
        
    except Exception as e:
        logger.error(f"Error finding nearest safe sites: {e}")
        return []


def get_active_admin_alerts(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 50.0
) -> List[Alert]:
    """
    Get active alerts from admins relevant to the location.
    Includes both location-targeted and general district/state alerts.
    """
    try:
        # Get district and state for location-based filtering
        # For now, get all active alerts and filter by expiration
        alerts = db.query(Alert).filter(
            Alert.is_active == True,
            or_(
                Alert.expires_at.is_(None),
                Alert.expires_at > datetime.now(timezone.utc)
            )
        ).order_by(
            Alert.severity.desc(),
            Alert.created_at.desc()
        ).limit(20).all()
        
        return alerts
        
    except Exception as e:
        logger.error(f"Error getting admin alerts: {e}")
        return []


def calculate_safety_status(
    inside_zone: Optional[HazardZone],
    nearby_zones: List[HazardZone]
) -> Dict[str, Any]:
    """
    Calculate overall safety status based on proximity to hazards.
    
    Returns:
        Dict with level (critical/high/medium/low/safe), message, and color
    """
    if inside_zone:
        return {
            "level": "critical",
            "message": f"⚠️ DANGER: You are inside {inside_zone.name}. Evacuate immediately!",
            "color": "red",
            "action": "EVACUATE NOW",
            "zone_name": inside_zone.name,
            "zone_intensity": inside_zone.intensity
        }
    
    if not nearby_zones:
        return {
            "level": "safe",
            "message": "✓ No active red zones detected nearby. Stay alert for updates.",
            "color": "green",
            "action": "STAY ALERT"
        }
    
    # Check closest zone
    closest = nearby_zones[0]
    distance = getattr(closest, 'distance_km', float('inf'))
    
    if distance < 2.0:
        return {
            "level": "critical",
            "message": f"⚠️ RED ZONE within 2km! {closest.name} is very close. Consider evacuation.",
            "color": "red",
            "action": "CONSIDER EVACUATION",
            "zone_name": closest.name,
            "distance_km": distance
        }
    elif distance < 5.0:
        return {
            "level": "high",
            "message": f"⚠️ Red zone within 5km: {closest.name}. Stay prepared to evacuate.",
            "color": "orange",
            "action": "STAY PREPARED",
            "zone_name": closest.name,
            "distance_km": distance
        }
    elif distance < 10.0:
        return {
            "level": "medium",
            "message": f"Red zone detected within 10km: {closest.name}. Monitor situation.",
            "color": "yellow",
            "action": "MONITOR SITUATION",
            "zone_name": closest.name,
            "distance_km": distance
        }
    else:
        return {
            "level": "low",
            "message": f"Red zone {closest.name} is {distance:.1f}km away. Stay informed.",
            "color": "blue",
            "action": "STAY INFORMED",
            "zone_name": closest.name,
            "distance_km": distance
        }


def generate_evacuation_recommendation(
    db: Session,
    latitude: float,
    longitude: float,
    inside_zone: Optional[HazardZone],
    nearby_zones: List[HazardZone],
    safe_sites: List[RelocationSite]
) -> Optional[Dict[str, Any]]:
    """
    Generate specific evacuation recommendation with routing.
    """
    if not safe_sites:
        return {
            "urgency": "critical",
            "message": "No safe sites available nearby. Contact emergency services at 112.",
            "action": "CALL_EMERGENCY",
            "phone": "112"
        }
    
    recommended_site = safe_sites[0]
    distance = getattr(recommended_site, 'distance_km', 0)
    
    # Estimate travel time (assume 20 km/h in evacuation scenario)
    travel_time_minutes = int((distance / 20) * 60)
    
    return {
        "urgency": "high" if inside_zone else "medium",
        "recommended_site": {
            "id": recommended_site.id,
            "name": recommended_site.name,
            "latitude": recommended_site.latitude,
            "longitude": recommended_site.longitude,
            "distance_km": distance,
            "estimated_travel_time_minutes": travel_time_minutes,
            "available_capacity": recommended_site.available_capacity,
            "facilities": recommended_site.facilities or []
        },
        "message": (
            f"Evacuate to {recommended_site.name} ({distance:.1f}km away). "
            f"Estimated travel time: {travel_time_minutes} minutes. "
            f"{recommended_site.available_capacity} household slots available."
        ),
        "action": "NAVIGATE_TO_SITE",
        "evacuation_steps": [
            "Gather essential documents and supplies",
            "Alert neighbors if safe to do so",
            "Follow navigation to relocation site",
            "Register at site administration upon arrival",
            "Contact 112 if you need assistance"
        ]
    }


def format_zone_details(zone: HazardZone) -> Dict[str, Any]:
    """Format red zone details for citizen display."""
    distance = getattr(zone, 'distance_km', None)
    
    return {
        "id": zone.id,
        "name": zone.name,
        "district": zone.district,
        "state": zone.state,
        "hazard_types": zone.hazard_types or [],
        "intensity": zone.intensity,
        "center_latitude": zone.center_lat,
        "center_longitude": zone.center_lon,
        "population_at_risk": zone.population_at_risk,
        "affected_area_sqkm": zone.affected_area_sqkm,
        "distance_km": distance,
        "last_incident": zone.last_incident_date.isoformat() if zone.last_incident_date else None
    }


def format_site_details(site: RelocationSite) -> Dict[str, Any]:
    """Format relocation site details for citizen display."""
    distance = getattr(site, 'distance_km', None)
    
    return {
        "id": site.id,
        "name": site.name,
        "district": site.district,
        "latitude": site.latitude,
        "longitude": site.longitude,
        "distance_km": distance,
        "available_capacity": site.available_capacity,
        "carrying_capacity": site.carrying_capacity,
        "facilities": site.facilities or [],
        "suitability_score": site.suitability_score
    }


def format_admin_alert(alert: Alert) -> Dict[str, Any]:
    """Format admin alert for citizen display."""
    return {
        "id": alert.id,
        "title": alert.title,
        "message": alert.message,
        "hazard_type": alert.hazard_type,
        "severity": alert.severity,
        "district": alert.district,
        "state": alert.state,
        "created_at": alert.created_at.isoformat(),
        "expires_at": alert.expires_at.isoformat() if alert.expires_at else None
    }
