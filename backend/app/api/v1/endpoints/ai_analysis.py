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
    # Clamp 'a' to prevent floating-point errors causing domain error in asin
    return R * 2 * math.asin(math.sqrt(min(1.0, a)))

def classify_tropical_cyclone(description, severity):
    """
    Classify tropical cyclone based on wind speed indicators in description.
    Categories based on IMD (Indian Meteorological Department) classification:
    - Depression: 31-49 km/h
    - Deep Depression: 50-61 km/h  
    - Cyclonic Storm: 62-88 km/h
    - Severe Cyclonic Storm: 89-117 km/h
    - Very Severe Cyclonic Storm: 118-166 km/h
    - Extremely Severe Cyclonic Storm: 167-221 km/h
    - Super Cyclonic Storm: 222+ km/h
    """
    if not description:
        return None
    
    desc_lower = description.lower()
    
    # Check for wind speed mentions
    import re
    wind_match = re.search(r'(\d+)\s*(?:km/?h|kmph|kph)', desc_lower)
    
    if wind_match:
        wind_speed = int(wind_match.group(1))
        if wind_speed >= 222:
            return {
                "category": "Super Cyclonic Storm",
                "wind_speed": f"{wind_speed}+ km/h",
                "severity": "Catastrophic",
                "color": "red"
            }
        elif wind_speed >= 167:
            return {
                "category": "Extremely Severe Cyclonic Storm",
                "wind_speed": f"{wind_speed} km/h",
                "severity": "Extreme",
                "color": "red"
            }
        elif wind_speed >= 118:
            return {
                "category": "Very Severe Cyclonic Storm",
                "wind_speed": f"{wind_speed} km/h",
                "severity": "Very High",
                "color": "orange"
            }
        elif wind_speed >= 89:
            return {
                "category": "Severe Cyclonic Storm",
                "wind_speed": f"{wind_speed} km/h",
                "severity": "High",
                "color": "orange"
            }
        elif wind_speed >= 62:
            return {
                "category": "Cyclonic Storm",
                "wind_speed": f"{wind_speed} km/h",
                "severity": "Moderate",
                "color": "yellow"
            }
        elif wind_speed >= 50:
            return {
                "category": "Deep Depression",
                "wind_speed": f"{wind_speed} km/h",
                "severity": "Low",
                "color": "green"
            }
        elif wind_speed >= 31:
            return {
                "category": "Depression",
                "wind_speed": f"{wind_speed} km/h",
                "severity": "Very Low",
                "color": "green"
            }
    
    # Fallback classification based on keywords if no wind speed
    if any(word in desc_lower for word in ['super cyclone', 'category 5', 'catastrophic']):
        return {"category": "Super Cyclonic Storm", "wind_speed": "222+ km/h", "severity": "Catastrophic", "color": "red"}
    elif any(word in desc_lower for word in ['extremely severe', 'category 4']):
        return {"category": "Extremely Severe Cyclonic Storm", "wind_speed": "167-221 km/h", "severity": "Extreme", "color": "red"}
    elif any(word in desc_lower for word in ['very severe', 'category 3']):
        return {"category": "Very Severe Cyclonic Storm", "wind_speed": "118-166 km/h", "severity": "Very High", "color": "orange"}
    elif any(word in desc_lower for word in ['severe cyclone', 'category 2']):
        return {"category": "Severe Cyclonic Storm", "wind_speed": "89-117 km/h", "severity": "High", "color": "orange"}
    elif any(word in desc_lower for word in ['cyclonic storm', 'tropical storm', 'category 1']):
        return {"category": "Cyclonic Storm", "wind_speed": "62-88 km/h", "severity": "Moderate", "color": "yellow"}
    elif 'deep depression' in desc_lower:
        return {"category": "Deep Depression", "wind_speed": "50-61 km/h", "severity": "Low", "color": "green"}
    elif 'depression' in desc_lower:
        return {"category": "Depression", "wind_speed": "31-49 km/h", "severity": "Very Low", "color": "green"}
    
    return None

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
        
        # Parse analysis breakdown from the best report
        analysis_breakdown = None
        if best.ai_analysis_breakdown:
            try:
                import json
                analysis_breakdown = json.loads(best.ai_analysis_breakdown)
            except:
                pass

        # Classify cyclone if applicable
        cyclone_classification = None
        if report.hazard_type and 'cyclone' in report.hazard_type.lower():
            cyclone_classification = classify_tropical_cyclone(
                best.description or best.ai_analysis_summary,
                best.severity
            )

        clusters.append({
            "cluster_id": f"cluster_{i}",
            "hazard_type": report.hazard_type,
            "report_count": len(cluster),
            "report_ids": [r.id for r in cluster],
            "center_lat": lat1,
            "center_lon": lon1,
            "ai_summary": best.ai_analysis_summary,
            "authenticity_score": round(avg_score, 2),
            "analysis_breakdown": analysis_breakdown,
            "cyclone_classification": cyclone_classification,
            "max_severity": max(cluster, key=lambda r: ["low","medium","high","critical"].index(r.severity or "low")).severity,
            "latest_report": max(cluster, key=lambda r: r.created_at).created_at.isoformat(),
        })

    # Sort by authenticity score descending (most credible first)
    clusters.sort(key=lambda c: c["authenticity_score"], reverse=True)
    return clusters