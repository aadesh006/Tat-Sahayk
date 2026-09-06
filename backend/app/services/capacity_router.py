"""
Capacity Routing Service for Relocation Site Assignment
Implements spatial load-balancing with atomic capacity updates
"""
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, and_

from app.models.red_zone import RelocationSite, VulnerableHabitation

logger = logging.getLogger(__name__)


def assign_habitation_to_site(
    db: Session,
    habitation_id: int,
    max_search_radius_km: float = 50.0
) -> Optional[Dict[str, Any]]:
    """
    Algorithmically assign a vulnerable habitation to the best available relocation site.
    Uses spatial load-balancing: finds nearby sites, sorts by capacity, atomic UPDATE.
    
    Args:
        db: Database session
        habitation_id: ID of habitation to assign
        max_search_radius_km: Maximum search radius for sites
        
    Returns:
        Dict with assignment details, or None if no suitable site found
    """
    try:
        # Get habitation details
        habitation = db.query(VulnerableHabitation).filter(
            VulnerableHabitation.id == habitation_id
        ).first()
        
        if not habitation:
            logger.error(f"Habitation #{habitation_id} not found")
            return None
        
        if habitation.recommended_site_id:
            logger.info(f"Habitation #{habitation_id} already assigned to site #{habitation.recommended_site_id}")
            return {
                "habitation_id": habitation_id,
                "site_id": habitation.recommended_site_id,
                "status": "already_assigned"
            }
        
        # Find nearby sites using PostGIS ST_DWithin, sorted by available capacity
        sites_query = text("""
            SELECT 
                id,
                name,
                available_capacity,
                carrying_capacity,
                current_occupancy,
                suitability_score,
                ST_Distance(
                    location::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                ) / 1000 as distance_km
            FROM relocation_sites
            WHERE 
                is_active = true
                AND available_capacity > 0
                AND ST_DWithin(
                    location::geography,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                    :radius_meters
                )
            ORDER BY 
                available_capacity DESC,
                suitability_score DESC,
                distance_km ASC
            LIMIT 10
        """)
        
        sites = db.execute(
            sites_query,
            {
                "lat": habitation.latitude,
                "lon": habitation.longitude,
                "radius_meters": max_search_radius_km * 1000
            }
        ).fetchall()
        
        if not sites:
            logger.warning(f"No available sites found within {max_search_radius_km}km of habitation #{habitation_id}")
            return None
        
        # Select best site (highest capacity, best suitability, closest)
        best_site = sites[0]
        site_id = best_site.id
        
        # Calculate required capacity for habitation
        required_capacity = habitation.households or 1
        
        if best_site.available_capacity < required_capacity:
            logger.warning(
                f"Best site #{site_id} has insufficient capacity "
                f"({best_site.available_capacity} < {required_capacity})"
            )
            return None
        
        # Atomic UPDATE to lock capacity slots (prevents double-booking)
        update_query = text("""
            UPDATE relocation_sites
            SET 
                current_occupancy = current_occupancy + :required_capacity,
                available_capacity = carrying_capacity - (current_occupancy + :required_capacity)
            WHERE 
                id = :site_id
                AND available_capacity >= :required_capacity
            RETURNING id, available_capacity
        """)
        
        result = db.execute(
            update_query,
            {
                "site_id": site_id,
                "required_capacity": required_capacity
            }
        ).fetchone()
        
        if not result:
            logger.error(f"Failed to lock capacity at site #{site_id} (race condition)")
            return None
        
        # Update habitation with assignment
        habitation.recommended_site_id = site_id
        habitation.relocation_status = "assigned"
        habitation.ai_assessment = (
            f"{habitation.ai_assessment or ''}\n"
            f"[Auto-assigned to {best_site.name} - "
            f"Distance: {best_site.distance_km:.1f}km, "
            f"Available: {result.available_capacity} slots]"
        ).strip()
        
        db.commit()
        
        logger.info(
            f"✓ Assigned habitation #{habitation_id} ({required_capacity} households) "
            f"to site #{site_id} ({best_site.name}) at {best_site.distance_km:.1f}km"
        )
        
        return {
            "habitation_id": habitation_id,
            "habitation_name": habitation.name,
            "site_id": site_id,
            "site_name": best_site.name,
            "distance_km": best_site.distance_km,
            "households_assigned": required_capacity,
            "remaining_capacity": result.available_capacity,
            "status": "assigned"
        }
        
    except Exception as e:
        logger.error(f"Error assigning habitation #{habitation_id}: {e}")
        db.rollback()
        return None


def bulk_assign_immediate_priority(
    db: Session,
    max_radius_km: float = 50.0
) -> List[Dict[str, Any]]:
    """
    Bulk assign all IMMEDIATE priority habitations to nearest available sites.
    Executes assignments in priority order.
    
    Args:
        db: Database session
        max_radius_km: Maximum search radius
        
    Returns:
        List of assignment results
    """
    try:
        # Get all IMMEDIATE priority habitations without site assignments
        immediate_habitations = db.query(VulnerableHabitation).filter(
            and_(
                VulnerableHabitation.priority == "IMMEDIATE",
                VulnerableHabitation.recommended_site_id.is_(None),
                VulnerableHabitation.relocation_status != "completed"
            )
        ).order_by(
            VulnerableHabitation.vulnerability_score.desc()
        ).all()
        
        if not immediate_habitations:
            logger.info("No IMMEDIATE priority habitations need assignment")
            return []
        
        logger.info(f"Bulk assigning {len(immediate_habitations)} IMMEDIATE priority habitations")
        
        results = []
        
        for habitation in immediate_habitations:
            result = assign_habitation_to_site(db, habitation.id, max_radius_km)
            if result:
                results.append(result)
        
        logger.info(f"Successfully assigned {len(results)}/{len(immediate_habitations)} habitations")
        return results
        
    except Exception as e:
        logger.error(f"Error in bulk assignment: {e}")
        db.rollback()
        return []


def release_site_capacity(
    db: Session,
    site_id: int,
    households_to_release: int
) -> bool:
    """
    Release capacity at a relocation site (e.g., when habitation assignment cancelled).
    Atomic operation to prevent capacity underflow.
    
    Args:
        db: Database session
        site_id: Relocation site ID
        households_to_release: Number of household slots to free up
        
    Returns:
        True if successful, False otherwise
    """
    try:
        update_query = text("""
            UPDATE relocation_sites
            SET 
                current_occupancy = GREATEST(0, current_occupancy - :release_amount),
                available_capacity = LEAST(
                    carrying_capacity,
                    carrying_capacity - GREATEST(0, current_occupancy - :release_amount)
                )
            WHERE id = :site_id
            RETURNING id, available_capacity
        """)
        
        result = db.execute(
            update_query,
            {
                "site_id": site_id,
                "release_amount": households_to_release
            }
        ).fetchone()
        
        if result:
            db.commit()
            logger.info(
                f"Released {households_to_release} capacity at site #{site_id}, "
                f"now available: {result.available_capacity}"
            )
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error releasing capacity at site #{site_id}: {e}")
        db.rollback()
        return False


def get_site_utilization_stats(db: Session) -> List[Dict[str, Any]]:
    """
    Get capacity utilization statistics for all active relocation sites.
    Useful for monitoring load distribution.
    
    Returns:
        List of site utilization stats
    """
    try:
        stats_query = text("""
            SELECT 
                id,
                name,
                district,
                carrying_capacity,
                current_occupancy,
                available_capacity,
                ROUND(
                    (current_occupancy::float / NULLIF(carrying_capacity, 0) * 100)::numeric,
                    1
                ) as utilization_percent,
                suitability_score
            FROM relocation_sites
            WHERE is_active = true
            ORDER BY utilization_percent DESC
        """)
        
        results = db.execute(stats_query).fetchall()
        
        stats = [
            {
                "site_id": row.id,
                "name": row.name,
                "district": row.district,
                "carrying_capacity": row.carrying_capacity,
                "current_occupancy": row.current_occupancy,
                "available_capacity": row.available_capacity,
                "utilization_percent": float(row.utilization_percent) if row.utilization_percent else 0.0,
                "suitability_score": row.suitability_score
            }
            for row in results
        ]
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting site stats: {e}")
        return []


def rebalance_assignments(
    db: Session,
    district: Optional[str] = None
) -> Dict[str, Any]:
    """
    Rebalance site assignments to optimize capacity distribution.
    Moves assignments from overutilized sites to underutilized ones.
    
    Args:
        db: Database session
        district: Optional district filter
        
    Returns:
        Summary of rebalancing operations
    """
    try:
        # Find overutilized sites (>90% capacity)
        overutilized_query = text("""
            SELECT id, name, current_occupancy, available_capacity
            FROM relocation_sites
            WHERE 
                is_active = true
                AND (current_occupancy::float / NULLIF(carrying_capacity, 0)) > 0.9
                {}
            ORDER BY current_occupancy DESC
        """.format("AND district = :district" if district else ""))
        
        params = {"district": district} if district else {}
        overutilized = db.execute(overutilized_query, params).fetchall()
        
        if not overutilized:
            logger.info("No overutilized sites found")
            return {"rebalanced": 0, "message": "No rebalancing needed"}
        
        rebalanced_count = 0
        
        for site in overutilized:
            # Find habitations assigned to this site
            habitations = db.query(VulnerableHabitation).filter(
                VulnerableHabitation.recommended_site_id == site.id,
                VulnerableHabitation.relocation_status == "assigned"
            ).order_by(
                VulnerableHabitation.vulnerability_score.asc()  # Move lower priority first
            ).limit(5).all()
            
            for hab in habitations:
                # Clear current assignment
                old_site_id = hab.recommended_site_id
                hab.recommended_site_id = None
                hab.relocation_status = "pending"
                
                # Release capacity
                release_site_capacity(db, old_site_id, hab.households or 1)
                
                # Reassign to new site
                result = assign_habitation_to_site(db, hab.id)
                if result and result.get("status") == "assigned":
                    rebalanced_count += 1
                    logger.info(f"Rebalanced habitation #{hab.id} from site #{old_site_id} to #{result['site_id']}")
        
        db.commit()
        
        return {
            "rebalanced": rebalanced_count,
            "overutilized_sites": len(overutilized),
            "message": f"Rebalanced {rebalanced_count} assignments"
        }
        
    except Exception as e:
        logger.error(f"Error rebalancing assignments: {e}")
        db.rollback()
        return {"rebalanced": 0, "error": str(e)}
