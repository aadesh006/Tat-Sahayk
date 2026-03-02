from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from geoalchemy2.shape import to_shape
from app.db.session import get_db
from app.api import deps
from app.models.report import Report
from app.models.user import User
import math

router = APIRouter()

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

@router.get("/clusters")
def get_ai_cluster_summaries(
    db: Session = Depends(get_db),
    admin: User = Depends(deps.get_current_user)
):
    # Get reports with AI scores
    reports = db.query(Report).filter(
        Report.ai_authenticity_score != None,  # noqa
        Report.status == "pending"
    ).all()

    # Re-cluster for display
    clusters = []
    assigned = set()

    for i, report in enumerate(reports):
        if i in assigned:
            continue
        shape = to_shape(report.location)
        lat1, lon1 = shape.y, shape.x
        cluster = [report]
        assigned.add(i)

        for j, other in enumerate(reports):
            if j in assigned or j == i:
                continue
            other_shape = to_shape(other.location)
            if haversine(lat1, lon1, other_shape.y, other_shape.x) <= 2.0:
                if other.hazard_type == report.hazard_type:
                    cluster.append(other)
                    assigned.add(j)

        # Use the highest-confidence score in the cluster
        best = max(cluster, key=lambda r: r.ai_authenticity_score or 0)
        avg_score = sum(r.ai_authenticity_score or 0 for r in cluster) / len(cluster)

        clusters.append({
            "cluster_id": f"cluster_{i}",
            "hazard_type": report.hazard_type,
            "report_count": len(cluster),
            "report_ids": [r.id for r in cluster],
            "center_lat": lat1,
            "center_lon": lon1,
            "ai_summary": best.ai_analysis_summary,
            "authenticity_score": round(avg_score, 2),
            "max_severity": max(cluster, key=lambda r: ["low","medium","high","critical"].index(r.severity or "low")).severity,
            "latest_report": max(cluster, key=lambda r: r.created_at).created_at.isoformat(),
        })

    # Sort by authenticity score descending (most credible first)
    clusters.sort(key=lambda c: c["authenticity_score"], reverse=True)
    return clusters