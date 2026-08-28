import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.report import Report
from app.services.multi_model_ai import analyze_report_cluster_multi_model
from geoalchemy2.shape import to_shape
import math

logger = logging.getLogger(__name__)

CLUSTER_RADIUS_KM = 80.0  # 80km radius for clustering
MIN_REPORTS_FOR_AI = 2        # AI kicks in with 2+ reports in same area
ANALYSIS_LOOKBACK_HOURS = 6   # Only analyze recent reports


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    # Clamp 'a' to prevent floating-point errors causing domain error in asin
    return R * 2 * math.asin(math.sqrt(min(1.0, a)))


def run_cluster_analysis():
    """
    Main job: finds geographic clusters of pending reports,
    sends them to Bedrock for analysis, updates DB with AI scores.
    """
    db: Session = SessionLocal()
    try:
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=ANALYSIS_LOOKBACK_HOURS)
        
        # Get all pending reports that haven't been AI-analyzed yet
        pending_reports = db.query(Report).filter(
            Report.status == "pending",
            Report.created_at >= cutoff_time,
            Report.ai_authenticity_score == None  # noqa
        ).all()

        if not pending_reports:
            logger.info("No pending reports to analyze")
            return

        logger.info(f"Analyzing {len(pending_reports)} pending reports")

        # Group reports into geographic clusters
        clusters = []
        assigned = set()

        for i, report in enumerate(pending_reports):
            if i in assigned:
                continue
                
            shape = to_shape(report.location)
            lat1, lon1 = shape.y, shape.x
            
            cluster = [report]
            assigned.add(i)

            for j, other in enumerate(pending_reports):
                if j in assigned or j == i:
                    continue
                other_shape = to_shape(other.location)
                lat2, lon2 = other_shape.y, other_shape.x
                
                if haversine(lat1, lon1, lat2, lon2) <= CLUSTER_RADIUS_KM:
                    # Also must be same hazard type for meaningful clustering
                    if other.hazard_type == report.hazard_type:
                        cluster.append(other)
                        assigned.add(j)

            clusters.append(cluster)

        # Analyze each cluster
        for cluster in clusters:
            if len(cluster) < MIN_REPORTS_FOR_AI:
                # Single isolated report — give a preliminary individual score
                report = cluster[0]
                shape = to_shape(report.location)
                result = {
                    "authenticity_score": 0.45,
                    "summary": "Single isolated report. Awaiting corroborating reports from nearby citizens.",
                    "severity_recommendation": report.severity or "medium",
                }
                _update_reports(db, cluster, result)
                continue

            # Build cluster payload for Bedrock
            center_shape = to_shape(cluster[0].location)
            
            cluster_data = {
                "hazard_type": cluster[0].hazard_type,
                "location": f"{center_shape.y:.4f}°N, {center_shape.x:.4f}°E",
                "district": getattr(cluster[0].owner, 'district', 'Unknown') if cluster[0].owner else 'Unknown',
                "state": getattr(cluster[0].owner, 'state', 'Unknown') if cluster[0].owner else 'Unknown',
                "report_count": len(cluster),
                "reports": [
                    {
                        "description": r.description or "",
                        "severity": r.severity or "medium",
                        "has_image": len(r.media) > 0 if r.media else False,
                        "image_url": r.media[0].file_path if (r.media and len(r.media) > 0) else None,
                        "time": r.created_at.isoformat() if r.created_at else "",
                    }
                    for r in cluster
                ]
            }

            logger.info(f"Sending cluster of {len(cluster)} {cluster[0].hazard_type} reports to Multi-Model AI")
            
            # Run async analysis
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            ai_result = loop.run_until_complete(analyze_report_cluster_multi_model(cluster_data))
            loop.close()
            
            _update_reports(db, cluster, ai_result)

        # Auto Red Zone detection from verified clusters
        _detect_red_zones_from_clusters(db, clusters)
        
        db.commit()
        logger.info("Cluster analysis complete")

    except Exception as e:
        logger.error(f"Cluster analysis job failed: {e}")
        db.rollback()
    finally:
        db.close()


def _update_reports(db, reports, ai_result):
    """Write AI results back to all reports in the cluster."""
    for report in reports:
        report.ai_authenticity_score = ai_result.get("authenticity_score", 0.5)
        report.ai_analysis_summary = ai_result.get("summary", "")
        
        # Store analysis breakdown as JSON string if available
        if ai_result.get("analysis_breakdown"):
            import json
            report.ai_analysis_breakdown = json.dumps(ai_result["analysis_breakdown"])
        
        # Optionally escalate severity if AI recommends critical
        if ai_result.get("severity_recommendation") == "critical" and report.severity != "critical":
            report.severity = "critical"



def _detect_red_zones_from_clusters(db: Session, clusters: list):
    """
    Auto-detect and create Red Zones from verified report clusters.
    Called after cluster analysis completes.
    Threshold: 3+ verified reports in same area = potential Red Zone
    """
    from app.models.red_zone import HazardZone
    from app.services.red_zone_ai import assess_cluster_as_red_zone
    from geoalchemy2.shape import from_shape
    from shapely.geometry import Point
    
    VERIFIED_CLUSTER_THRESHOLD = 3  # 3+ verified reports = check for Red Zone
    
    # Filter to only verified clusters with sufficient reports
    verified_clusters = []
    for cluster in clusters:
        # Check if all reports in cluster are verified
        verified_count = sum(1 for r in cluster if r.status == 'verified')
        if verified_count >= VERIFIED_CLUSTER_THRESHOLD:
            verified_clusters.append(cluster)
    
    if not verified_clusters:
        logger.info("No verified clusters meet Red Zone threshold")
        return
    
    logger.info(f"Analyzing {len(verified_clusters)} verified clusters for Red Zone detection")
    
    for cluster in verified_clusters:
        try:
            # Get cluster center location
            center_shape = to_shape(cluster[0].location)
            center_lat = center_shape.y
            center_lon = center_shape.x
            
            # Check if Red Zone already exists nearby (within 10km)
            from sqlalchemy import text
            existing = db.execute(
                text("""
                    SELECT id FROM hazard_zones 
                    WHERE ST_DWithin(
                        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                        boundary::geography, 10000
                    ) AND is_active = true 
                    LIMIT 1
                """),
                {"lat": center_lat, "lon": center_lon}
            ).fetchone()
            
            if existing:
                logger.info(f"Red Zone already exists near cluster at {center_lat:.4f}N, {center_lon:.4f}E")
                continue
            
            # Build cluster payload for AI assessment
            cluster_payload = {
                "location": f"{center_lat:.4f}N, {center_lon:.4f}E",
                "district": getattr(cluster[0].owner, 'district', 'Unknown') if cluster[0].owner else 'Unknown',
                "state": getattr(cluster[0].owner, 'state', 'India') if cluster[0].owner else 'India',
                "hazard_type": cluster[0].hazard_type,
                "report_count": len(cluster),
                "radius_km": CLUSTER_RADIUS_KM,
                "reports": [
                    {
                        "description": r.description[:100] if r.description else "",
                        "severity": r.severity,
                        "created_at": r.created_at.isoformat() if r.created_at else ""
                    }
                    for r in cluster[:5]  # Send top 5 for AI assessment
                ]
            }
            
            # Call AI to assess if this qualifies as a Red Zone
            assessment = assess_cluster_as_red_zone(cluster_payload)
            
            if assessment.get("is_red_zone") and assessment.get("confidence", 0) >= 0.6:
                # Create a circular polygon approximation for the Red Zone
                circle_center = Point(center_lon, center_lat)
                affected_radius = assessment.get("affected_radius_km", 5)
                radius_degrees = affected_radius / 111  # Rough conversion km to degrees
                circle = circle_center.buffer(radius_degrees)
                
                # Create new HazardZone
                new_zone = HazardZone(
                    name=f"Auto-detected: {cluster[0].hazard_type} zone near {cluster_payload['district']}",
                    district=cluster_payload["district"],
                    state=cluster_payload["state"],
                    hazard_types=[cluster[0].hazard_type],
                    intensity=assessment.get("intensity", "medium"),
                    boundary=from_shape(circle, srid=4326),
                    center_lat=center_lat,
                    center_lon=center_lon,
                    population_at_risk=assessment.get("population_at_risk_estimate", 0),
                    affected_area_sqkm=affected_radius ** 2 * 3.14159,
                    ai_confidence=assessment.get("confidence", 0),
                    ai_reasoning=assessment.get("reasoning", ""),
                    source="auto_cluster",
                    last_incident_date=cluster[0].created_at,
                )
                
                db.add(new_zone)
                logger.info(f"✓ Auto-created Red Zone for {cluster[0].hazard_type} cluster in {cluster_payload['district']}")
                logger.info(f"  Confidence: {assessment.get('confidence', 0):.2f}, Intensity: {assessment.get('intensity')}")
            else:
                logger.info(f"Cluster did not qualify as Red Zone (confidence: {assessment.get('confidence', 0):.2f})")
                
        except Exception as e:
            logger.error(f"Error detecting Red Zone from cluster: {e}")
            continue
