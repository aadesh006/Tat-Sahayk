"""
Spatial Operations Service for Red Zone Management
Handles PostGIS operations for dynamic boundary evolution
"""
import logging
from typing import List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text, and_
from geoalchemy2.shape import to_shape, from_shape
from shapely.geometry import Point, MultiPoint, Polygon
from shapely.ops import unary_union

from app.models.red_zone import HazardZone
from app.models.report import Report

logger = logging.getLogger(__name__)


def generate_concave_hull_from_reports(
    db: Session,
    report_ids: List[int],
    alpha: float = 0.1
) -> Optional[Polygon]:
    """
    Generate a concave hull polygon tightly wrapping a cluster of reports.
    Uses PostGIS ST_ConcaveHull for organic boundary shapes.
    
    Args:
        db: Database session
        report_ids: List of report IDs to cluster
        alpha: Concaveness parameter (0-1, lower = tighter fit)
        
    Returns:
        Shapely Polygon representing the concave hull, or None if insufficient points
    """
    try:
        if len(report_ids) < 3:
            logger.warning("Need at least 3 reports for concave hull")
            return None
        
        # Build comma-separated ID list for SQL
        id_list = ','.join(str(id) for id in report_ids)
        
        # Use PostGIS ST_ConcaveHull with ST_Collect to aggregate all report locations
        query = text(f"""
            SELECT ST_AsText(
                ST_ConcaveHull(
                    ST_Collect(location),
                    :alpha,
                    true
                )
            )
            FROM reports
            WHERE id IN ({id_list})
        """)
        
        result = db.execute(query, {"alpha": alpha}).fetchone()
        
        if result and result[0]:
            from shapely import wkt
            hull_polygon = wkt.loads(result[0])
            logger.info(f"Generated concave hull from {len(report_ids)} reports")
            return hull_polygon
        
        return None
        
    except Exception as e:
        logger.error(f"Error generating concave hull: {e}")
        return None


def merge_overlapping_zones(db: Session) -> int:
    """
    Detect and merge overlapping hazard zones using PostGIS ST_Union.
    Executes in a single transaction, merging zones of same hazard type.
    
    Returns:
        Number of zones merged
    """
    try:
        # Find overlapping zone pairs (same hazard type, both active)
        overlap_query = text("""
            SELECT 
                z1.id as id1,
                z2.id as id2,
                z1.hazard_types,
                z1.intensity,
                z2.intensity,
                ST_AsText(ST_Union(z1.boundary, z2.boundary)) as merged_boundary,
                ST_AsText(ST_Centroid(ST_Union(z1.boundary, z2.boundary))) as merged_center,
                ST_Area(ST_Union(z1.boundary, z2.boundary)::geography) / 1000000 as merged_area_sqkm
            FROM hazard_zones z1
            JOIN hazard_zones z2 ON z1.id < z2.id
            WHERE 
                z1.is_active = true 
                AND z2.is_active = true
                AND z1.hazard_types && z2.hazard_types
                AND ST_Overlaps(z1.boundary, z2.boundary)
            LIMIT 10
        """)
        
        overlaps = db.execute(overlap_query).fetchall()
        
        if not overlaps:
            logger.info("No overlapping zones found")
            return 0
        
        merge_count = 0
        
        for overlap in overlaps:
            id1, id2 = overlap.id1, overlap.id2
            hazard_types = overlap.hazard_types
            
            # Determine merged intensity (take higher of the two)
            intensity_order = {"low": 1, "medium": 2, "high": 3, "critical": 4}
            intensity1_val = intensity_order.get(overlap.intensity, 2)
            intensity2_val = intensity_order.get(overlap[4], 2)
            merged_intensity = "medium"
            for name, val in intensity_order.items():
                if val == max(intensity1_val, intensity2_val):
                    merged_intensity = name
                    break
            
            # Parse merged geometry
            from shapely import wkt
            merged_boundary = wkt.loads(overlap.merged_boundary)
            merged_center = wkt.loads(overlap.merged_center)
            
            # Get source zones for metadata
            zone1 = db.query(HazardZone).filter(HazardZone.id == id1).first()
            zone2 = db.query(HazardZone).filter(HazardZone.id == id2).first()
            
            if not zone1 or not zone2:
                continue
            
            # Create merged zone
            merged_zone = HazardZone(
                name=f"Merged: {zone1.name} + {zone2.name}"[:255],
                district=zone1.district,
                state=zone1.state,
                hazard_types=list(set(zone1.hazard_types + zone2.hazard_types)),
                intensity=merged_intensity,
                boundary=from_shape(merged_boundary, srid=4326),
                center_lat=merged_center.y,
                center_lon=merged_center.x,
                population_at_risk=zone1.population_at_risk + zone2.population_at_risk,
                affected_area_sqkm=overlap.merged_area_sqkm,
                ai_confidence=(zone1.ai_confidence + zone2.ai_confidence) / 2,
                ai_reasoning=f"Merged from zones #{id1} and #{id2} due to overlap",
                source="auto_merge",
                last_incident_date=max(
                    zone1.last_incident_date or datetime.now(timezone.utc),
                    zone2.last_incident_date or datetime.now(timezone.utc)
                ),
                created_by=zone1.created_by
            )
            
            # Deactivate source zones
            zone1.is_active = False
            zone2.is_active = False
            
            db.add(merged_zone)
            merge_count += 1
            
            logger.info(f"Merged zones #{id1} and #{id2} into new zone (intensity: {merged_intensity})")
        
        db.commit()
        logger.info(f"Merged {merge_count} overlapping zone pairs")
        return merge_count
        
    except Exception as e:
        logger.error(f"Error merging zones: {e}")
        db.rollback()
        return 0


def decay_zone_intensity(db: Session, decay_days: int = 30) -> int:
    """
    Decay intensity of zones that haven't had recent incidents.
    Reduces intensity level over time as disaster subsides.
    
    Args:
        decay_days: Number of days since last incident to trigger decay
        
    Returns:
        Number of zones decayed
    """
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=decay_days)
        
        # Intensity decay mapping
        decay_map = {
            "critical": "high",
            "high": "medium",
            "medium": "low"
        }
        
        zones_to_decay = db.query(HazardZone).filter(
            HazardZone.is_active == True,
            HazardZone.intensity.in_(["critical", "high", "medium"]),
            HazardZone.last_incident_date < cutoff_date
        ).all()
        
        decay_count = 0
        
        for zone in zones_to_decay:
            old_intensity = zone.intensity
            new_intensity = decay_map.get(old_intensity)
            
            if new_intensity:
                zone.intensity = new_intensity
                zone.ai_reasoning = f"{zone.ai_reasoning or ''}\n[Auto-decay: {old_intensity} → {new_intensity} after {decay_days} days without incidents]".strip()
                decay_count += 1
                logger.info(f"Decayed zone #{zone.id} from {old_intensity} to {new_intensity}")
        
        # Deactivate "low" intensity zones older than 60 days
        old_low_zones = db.query(HazardZone).filter(
            HazardZone.is_active == True,
            HazardZone.intensity == "low",
            HazardZone.last_incident_date < datetime.now(timezone.utc) - timedelta(days=60)
        ).all()
        
        for zone in old_low_zones:
            zone.is_active = False
            logger.info(f"Deactivated old low-intensity zone #{zone.id}")
            decay_count += 1
        
        db.commit()
        logger.info(f"Decayed {decay_count} zones")
        return decay_count
        
    except Exception as e:
        logger.error(f"Error decaying zone intensity: {e}")
        db.rollback()
        return 0


def find_nearby_zones(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 10.0
) -> List[HazardZone]:
    """
    Find all hazard zones within radius of a point using PostGIS ST_DWithin.
    
    Args:
        db: Database session
        latitude: Point latitude
        longitude: Point longitude
        radius_km: Search radius in kilometers
        
    Returns:
        List of nearby HazardZone objects
    """
    try:
        query = text("""
            SELECT id FROM hazard_zones
            WHERE is_active = true
            AND ST_DWithin(
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                boundary::geography,
                :radius_meters
            )
            ORDER BY ST_Distance(
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                boundary::geography
            )
        """)
        
        result = db.execute(
            query,
            {
                "lat": latitude,
                "lon": longitude,
                "radius_meters": radius_km * 1000
            }
        ).fetchall()
        
        zone_ids = [row.id for row in result]
        zones = db.query(HazardZone).filter(HazardZone.id.in_(zone_ids)).all() if zone_ids else []
        
        logger.info(f"Found {len(zones)} zones within {radius_km}km of ({latitude:.4f}, {longitude:.4f})")
        return zones
        
    except Exception as e:
        logger.error(f"Error finding nearby zones: {e}")
        return []


def check_point_in_zone(
    db: Session,
    latitude: float,
    longitude: float
) -> Optional[HazardZone]:
    """
    Check if a point falls within any active hazard zone.
    Uses PostGIS ST_Contains for accurate polygon containment.
    
    Returns:
        HazardZone if point is inside a zone, None otherwise
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
        
        result = db.execute(
            query,
            {"lat": latitude, "lon": longitude}
        ).fetchone()
        
        if result:
            zone = db.query(HazardZone).filter(HazardZone.id == result.id).first()
            logger.info(f"Point ({latitude:.4f}, {longitude:.4f}) is inside zone #{zone.id}")
            return zone
        
        return None
        
    except Exception as e:
        logger.error(f"Error checking point in zone: {e}")
        return None
