import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.report import Report
from app.services.bedrock_ai import analyze_report_cluster
from geoalchemy2.shape import to_shape
import math

logger = logging.getLogger(__name__)

CLUSTER_RADIUS_KM = 2.0
MIN_REPORTS_FOR_AI = 2        # AI kicks in with 2+ reports in same area
ANALYSIS_LOOKBACK_HOURS = 6   # Only analyze recent reports


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


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
                "report_count": len(cluster),
                "reports": [
                    {
                        "description": r.description or "",
                        "severity": r.severity or "medium",
                        "has_image": len(r.media) > 0 if r.media else False,
                        "time": r.created_at.isoformat() if r.created_at else "",
                    }
                    for r in cluster
                ]
            }

            logger.info(f"Sending cluster of {len(cluster)} {cluster[0].hazard_type} reports to Bedrock")
            ai_result = analyze_report_cluster(cluster_data)
            _update_reports(db, cluster, ai_result)

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
        # Optionally escalate severity if AI recommends critical
        if ai_result.get("severity_recommendation") == "critical" and report.severity != "critical":
            report.severity = "critical"