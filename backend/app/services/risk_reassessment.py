"""
Risk Reassessment Service for Vulnerable Habitations
Dynamically recalculates vulnerability scores when field conditions change
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text, and_

from app.models.red_zone import VulnerableHabitation, HazardZone
from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)


def trigger_zone_impact_reassessment(
    db: Session,
    zone_id: int,
    background_tasks: Optional[BackgroundTasks] = None,
    radius_km: float = 15.0
) -> Dict[str, Any]:
    """
    Triggered when a new red zone is created or updated.
    Finds all habitations within radius and queues them for AI reassessment.
    
    Args:
        db: Database session
        zone_id: ID of the new/updated hazard zone
        background_tasks: FastAPI background tasks queue
        radius_km: Assessment radius (default 15km)
        
    Returns:
        Summary of habitations queued for reassessment
    """
    try:
        # Get the zone details
        zone = db.query(HazardZone).filter(HazardZone.id == zone_id).first()
        
        if not zone:
            logger.error(f"Zone #{zone_id} not found")
            return {"queued": 0, "error": "Zone not found"}
        
        logger.info(f"Triggering reassessment for zone #{zone_id}: {zone.name}")
        
        # Find all habitations within radius using PostGIS
        query = text("""
            SELECT 
                h.id,
                h.name,
                h.latitude,
                h.longitude,
                h.priority,
                ST_Distance(
                    h.location::geography,
                    z.boundary::geography
                ) / 1000 as distance_km
            FROM vulnerable_habitations h
            CROSS JOIN hazard_zones z
            WHERE 
                z.id = :zone_id
                AND ST_DWithin(
                    h.location::geography,
                    z.boundary::geography,
                    :radius_meters
                )
            ORDER BY distance_km ASC
        """)
        
        results = db.execute(
            query,
            {
                "zone_id": zone_id,
                "radius_meters": radius_km * 1000
            }
        ).fetchall()
        
        if not results:
            logger.info(f"No habitations found within {radius_km}km of zone #{zone_id}")
            return {
                "queued": 0,
                "zone_id": zone_id,
                "zone_name": zone.name,
                "message": f"No habitations within {radius_km}km"
            }
        
        logger.info(f"Found {len(results)} habitations within {radius_km}km of zone #{zone_id}")
        
        # Queue each habitation for AI reassessment
        queued_count = 0
        immediate_count = 0
        
        for row in results:
            habitation_id = row.id
            distance_km = row.distance_km
            
            # If using background tasks, queue async AI assessment
            if background_tasks:
                background_tasks.add_task(
                    reassess_single_habitation,
                    habitation_id,
                    zone_id,
                    distance_km
                )
                queued_count += 1
            else:
                # Synchronous reassessment
                result = reassess_single_habitation_sync(
                    db,
                    habitation_id,
                    zone_id,
                    distance_km
                )
                if result:
                    queued_count += 1
                    if result.get("new_priority") == "IMMEDIATE":
                        immediate_count += 1
        
        logger.info(f"✓ Queued {queued_count} habitations for reassessment due to zone #{zone_id}")
        
        return {
            "queued": queued_count,
            "immediate_escalations": immediate_count,
            "zone_id": zone_id,
            "zone_name": zone.name,
            "zone_intensity": zone.intensity,
            "radius_km": radius_km
        }
        
    except Exception as e:
        logger.error(f"Error triggering reassessment for zone #{zone_id}: {e}")
        return {"queued": 0, "error": str(e)}


def reassess_single_habitation(
    habitation_id: int,
    triggering_zone_id: int,
    distance_km: float
):
    """
    Background task: Reassess a single habitation's priority using AI.
    Runs in background task queue.
    
    Args:
        habitation_id: Habitation to reassess
        triggering_zone_id: Zone that triggered this reassessment
        distance_km: Distance from habitation to zone
    """
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    try:
        reassess_single_habitation_sync(db, habitation_id, triggering_zone_id, distance_km)
    finally:
        db.close()


def reassess_single_habitation_sync(
    db: Session,
    habitation_id: int,
    triggering_zone_id: int,
    distance_km: float
) -> Optional[Dict[str, Any]]:
    """
    Synchronous reassessment of a single habitation.
    Updates vulnerability score and priority based on proximity to new zone.
    
    Args:
        db: Database session
        habitation_id: Habitation to reassess
        triggering_zone_id: Zone that triggered reassessment
        distance_km: Distance to zone
        
    Returns:
        Dict with reassessment results
    """
    try:
        habitation = db.query(VulnerableHabitation).filter(
            VulnerableHabitation.id == habitation_id
        ).first()
        
        if not habitation:
            logger.error(f"Habitation #{habitation_id} not found")
            return None
        
        zone = db.query(HazardZone).filter(
            HazardZone.id == triggering_zone_id
        ).first()
        
        if not zone:
            return None
        
        old_priority = habitation.priority
        old_vulnerability = habitation.vulnerability_score
        
        # Calculate new exposure score based on distance and zone intensity
        # Closer distance = higher exposure
        # Higher zone intensity = higher exposure
        intensity_weights = {
            "low": 0.25,
            "medium": 0.50,
            "high": 0.75,
            "critical": 1.0
        }
        
        zone_weight = intensity_weights.get(zone.intensity, 0.5)
        
        # Distance decay: full exposure at 0km, decays to 0 at 15km
        distance_factor = max(0, 1 - (distance_km / 15.0))
        
        new_exposure = min(1.0, zone_weight * distance_factor)
        
        # Update exposure score (take maximum of current and new)
        habitation.exposure_score = max(habitation.exposure_score or 0, new_exposure)
        
        # Recalculate vulnerability score (composite of exposure + other factors)
        # For now, exposure is weighted heavily in disaster scenarios
        habitation.vulnerability_score = min(
            1.0,
            habitation.exposure_score * 0.7 + (habitation.vulnerability_score or 0.3) * 0.3
        )
        
        # Update priority based on vulnerability score and distance
        new_priority = calculate_priority_from_vulnerability(
            habitation.vulnerability_score,
            distance_km
        )
        
        old_priority_val = habitation.priority
        habitation.priority = new_priority
        
        # Update nearest hazard zone if this is closer
        if not habitation.nearest_hazard_zone_id or distance_km < 5.0:
            habitation.nearest_hazard_zone_id = triggering_zone_id
        
        # Update assessment metadata
        habitation.last_assessed = datetime.now(timezone.utc)
        habitation.priority_reason = (
            f"Reassessed due to {zone.intensity} intensity {zone.hazard_types[0] if zone.hazard_types else 'hazard'} zone "
            f"#{triggering_zone_id} at {distance_km:.1f}km. "
            f"Exposure: {habitation.exposure_score:.2f}, Vulnerability: {habitation.vulnerability_score:.2f}"
        )
        
        # Estimate timeline
        if new_priority == "IMMEDIATE":
            habitation.estimated_timeline_months = 0
        elif new_priority == "SHORT_TERM":
            habitation.estimated_timeline_months = 3
        elif new_priority == "MEDIUM_TERM":
            habitation.estimated_timeline_months = 12
        else:
            habitation.estimated_timeline_months = 36
        
        db.commit()
        
        priority_changed = old_priority_val != new_priority
        
        if priority_changed:
            logger.info(
                f"✓ Habitation #{habitation_id} priority: {old_priority_val} → {new_priority} "
                f"(zone #{triggering_zone_id} at {distance_km:.1f}km)"
            )
        
        # If escalated to IMMEDIATE, trigger capacity routing
        if new_priority == "IMMEDIATE" and old_priority_val != "IMMEDIATE":
            from app.services.capacity_router import assign_habitation_to_site
            assignment = assign_habitation_to_site(db, habitation_id)
            
            return {
                "habitation_id": habitation_id,
                "old_priority": old_priority_val,
                "new_priority": new_priority,
                "vulnerability_score": habitation.vulnerability_score,
                "distance_km": distance_km,
                "priority_changed": True,
                "site_assigned": assignment is not None,
                "assignment": assignment
            }
        
        return {
            "habitation_id": habitation_id,
            "old_priority": old_priority_val,
            "new_priority": new_priority,
            "vulnerability_score": habitation.vulnerability_score,
            "distance_km": distance_km,
            "priority_changed": priority_changed
        }
        
    except Exception as e:
        logger.error(f"Error reassessing habitation #{habitation_id}: {e}")
        db.rollback()
        return None


def calculate_priority_from_vulnerability(
    vulnerability_score: float,
    distance_km: float
) -> str:
    """
    Calculate priority level from vulnerability score and distance.
    
    Args:
        vulnerability_score: Composite vulnerability (0-1)
        distance_km: Distance to nearest hazard zone
        
    Returns:
        Priority level: IMMEDIATE, SHORT_TERM, MEDIUM_TERM, or SAFE
    """
    # IMMEDIATE: High vulnerability (>0.75) and very close (<2km)
    if vulnerability_score >= 0.75 and distance_km < 2.0:
        return "IMMEDIATE"
    
    # IMMEDIATE: Critical vulnerability (>0.85) within 5km
    if vulnerability_score >= 0.85 and distance_km < 5.0:
        return "IMMEDIATE"
    
    # SHORT_TERM: Medium-high vulnerability (>0.60) and close (<5km)
    if vulnerability_score >= 0.60 and distance_km < 5.0:
        return "SHORT_TERM"
    
    # SHORT_TERM: High vulnerability (>0.70) within 10km
    if vulnerability_score >= 0.70 and distance_km < 10.0:
        return "SHORT_TERM"
    
    # MEDIUM_TERM: Moderate vulnerability (>0.40) within 15km
    if vulnerability_score >= 0.40 and distance_km < 15.0:
        return "MEDIUM_TERM"
    
    # SAFE: Low vulnerability or far from hazards
    return "SAFE"


def bulk_reassess_all_habitations(db: Session) -> Dict[str, Any]:
    """
    Reassess all habitations against all active zones.
    Useful for periodic recalculation or after major zone updates.
    
    Returns:
        Summary of reassessment operation
    """
    try:
        # Get all active zones
        zones = db.query(HazardZone).filter(HazardZone.is_active == True).all()
        
        if not zones:
            logger.info("No active zones for reassessment")
            return {"reassessed": 0, "message": "No active zones"}
        
        # Get all habitations
        habitations = db.query(VulnerableHabitation).all()
        
        if not habitations:
            logger.info("No habitations to reassess")
            return {"reassessed": 0, "message": "No habitations"}
        
        logger.info(f"Bulk reassessing {len(habitations)} habitations against {len(zones)} zones")
        
        reassessed_count = 0
        escalated_count = 0
        
        for habitation in habitations:
            # Find nearest zone
            nearest_zone = None
            min_distance = float('inf')
            
            for zone in zones:
                # Calculate distance using PostGIS
                query = text("""
                    SELECT ST_Distance(
                        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                        boundary::geography
                    ) / 1000 as distance_km
                    FROM hazard_zones
                    WHERE id = :zone_id
                """)
                
                result = db.execute(
                    query,
                    {
                        "lat": habitation.latitude,
                        "lon": habitation.longitude,
                        "zone_id": zone.id
                    }
                ).fetchone()
                
                if result and result.distance_km < min_distance:
                    min_distance = result.distance_km
                    nearest_zone = zone
            
            if nearest_zone and min_distance < 15.0:
                old_priority = habitation.priority
                result = reassess_single_habitation_sync(
                    db,
                    habitation.id,
                    nearest_zone.id,
                    min_distance
                )
                
                if result:
                    reassessed_count += 1
                    if result.get("new_priority") == "IMMEDIATE" and old_priority != "IMMEDIATE":
                        escalated_count += 1
        
        db.commit()
        
        logger.info(f"✓ Bulk reassessed {reassessed_count} habitations, {escalated_count} escalated to IMMEDIATE")
        
        return {
            "reassessed": reassessed_count,
            "escalated_to_immediate": escalated_count,
            "total_habitations": len(habitations),
            "active_zones": len(zones)
        }
        
    except Exception as e:
        logger.error(f"Error in bulk reassessment: {e}")
        db.rollback()
        return {"reassessed": 0, "error": str(e)}
