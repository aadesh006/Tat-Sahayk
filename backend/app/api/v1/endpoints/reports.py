from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import report as crud_report
from app.schemas.report import ReportCreate, ReportResponse
from app.db.session import get_db
from app.models.user import User
import math

#HELPER: Calculate Distance in KM
def calculate_distance(lat1, lon1, lat2, lon2):
    """Returns distance in kilometers between two GPS coordinates using Haversine."""
    R = 6371.0 # Earth radius in km
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) * math.sin(dlon / 2))
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

#HELPER: Cluster Reports
def cluster_reports(reports, max_distance_km=2.0):
    """Groups reports that are within max_distance_km of each other."""
    clusters = []
    visited = set()
    
    for i, report in enumerate(reports):
        if i in visited:
            continue
            
        # Start a new cluster
        current_cluster = {
            "center_lat": report.latitude,
            "center_lon": report.longitude,
            "hazard_type": report.hazard_type,
            "severity": report.severity,
            "report_count": 1,
            "reports": [report.id]
        }
        visited.add(i)
        
        # Find all other reports close to this one
        for j, other_report in enumerate(reports):
            if j not in visited and other_report.hazard_type == report.hazard_type:
                dist = calculate_distance(
                    report.latitude, report.longitude,
                    other_report.latitude, other_report.longitude
                )
                
                if dist <= max_distance_km:
                    current_cluster["report_count"] += 1
                    current_cluster["reports"].append(other_report.id)
                    visited.add(j)
                    
                    # Update center to be the average of the coordinates
                    n = current_cluster["report_count"]
                    current_cluster["center_lat"] = ((current_cluster["center_lat"] * (n - 1)) + other_report.latitude) / n
                    current_cluster["center_lon"] = ((current_cluster["center_lon"] * (n - 1)) + other_report.longitude) / n
                    
                    # Escalate severity if there are multiple reports
                    if current_cluster["report_count"] >= 3:
                        current_cluster["severity"] = "critical"
                        
        clusters.append(current_cluster)
        
    return clusters

router = APIRouter()

@router.post("/", response_model=ReportResponse)
def create_report(
    *,
    db: Session = Depends(get_db),
    report_in: ReportCreate,
    current_user: User = Depends(deps.get_current_user)
):
    #Create a new hazard report.
    report = crud_report.create_report(db=db, report=report_in, user_id=current_user.id)
    return report

@router.get("/", response_model=List[ReportResponse])
def read_reports(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    #Retrieve reports.
    reports = crud_report.get_reports(db, skip=skip, limit=limit)
    return reports

#GET HOTSPOTS (Map / Admin Clustering)
@router.get("/hotspots")
def get_hazard_hotspots(
    db: Session = Depends(get_db),
    radius_km: float = Query(2.0, description="Max distance in km to cluster reports together")
):
    active_reports = db.query(Report).filter(Report.status != "false").all()
    
    if not active_reports:
        return {"message": "No active hazards", "hotspots": []}
        
    # Run the clustering algorithm
    hotspots = cluster_reports(active_reports, max_distance_km=radius_km)
    
    # Sort so the biggest hotspots appear first
    hotspots.sort(key=lambda x: x["report_count"], reverse=True)
    
    return {
        "total_active_reports": len(active_reports),
        "total_hotspots": len(hotspots),
        "hotspots": hotspots
    }