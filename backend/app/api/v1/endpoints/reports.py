from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
import httpx  # For making HTTP requests to the ML service
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.crud import report as crud_report
from app.schemas.report import ReportCreate, ReportResponse
from app.models.report import Report
from app.db.session import SessionLocal, get_db
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

def analyze_report_with_ai(report_id: int, text: str, image_url: str):
    db = SessionLocal()
    try:
        # Call the ML Service (Assuming it runs on port 8000 inside Docker)
        ml_api_url = "http://ml-service:8000/api/analyze" 
        
        with httpx.Client() as client:
            response = client.post(ml_api_url, json={
                "text": text,
                "image_url": image_url
            }, timeout=30.0)
            
            if response.status_code == 200:
                ai_data = response.json()
                
                # Update the report in the database
                report = db.query(Report).filter(Report.id == report_id).first()
                if report:
                    report.ai_authenticity_score = ai_data.get("credibility_score", 0.0)
                    report.ai_analysis_summary = ai_data.get("hazard_detected", "Analysis complete")
                    db.commit()
                    print(f"AI Analysis complete for Report {report_id}")
            else:
                print(f"ML Service returned status {response.status_code}")
                
    except Exception as e:
        print(f"Failed to connect to ML Service: {e}")
    finally:
        db.close()

# 1. CREATE REPORT (Citizen)
@router.post("/", response_model=ReportResponse)
def create_report(
    *,
    db: Session = Depends(get_db),
    report_in: ReportCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_user)
):
    report = crud_report.create_report(db=db, report=report_in, user_id=current_user.id)
    
    background_tasks.add_task(
        analyze_report_with_ai, 
        report_id=report.id, 
        text=report.description, 
        image_url=report.image_url
    )
    return report

# 2. GET REPORTS (Admin Dashboard List - Now with Filters)
@router.get("/", response_model=List[ReportResponse])
def read_reports(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Filter by status (e.g., pending, verified, false)"),
    severity: Optional[str] = Query(None, description="Filter by severity (e.g., low, medium, high, critical)")
):
    query = db.query(Report)
    
    if status:
        query = query.filter(Report.status == status)
    if severity:
        query = query.filter(Report.severity == severity)
        
    # Order by newest first
    reports = query.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()
    return reports

# 3. GET STATS (Admin Dashboard Top Bar)
@router.get("/stats")
def get_report_stats(db: Session = Depends(get_db)):
    total = db.query(Report).count()
    pending = db.query(Report).filter(Report.status == "pending").count()
    verified = db.query(Report).filter(Report.status == "verified").count()
    critical = db.query(Report).filter(Report.severity == "critical").count()
    
    return {
        "total_reports": total,
        "pending_review": pending,
        "verified_hazards": verified,
        "critical_alerts": critical
    }

# 4. VERIFY REPORT (Admin Action)
@router.patch("/{report_id}/verify", response_model=ReportResponse)
def verify_report(
    report_id: int, 
    status: str, # "verified", "false", or "pending"
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = status
    
    # Update the boolean is_verified flag from your original model
    if status == "verified":
        report.is_verified = True
    else:
        report.is_verified = False
        
    db.commit()
    db.refresh(report)
    return report
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
