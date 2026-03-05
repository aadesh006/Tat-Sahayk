from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.crud import report as crud_report
from app.schemas.report import ReportCreate, ReportResponse
from app.models.report import Report
from app.models.user import User
from app.db.session import SessionLocal, get_db
import math
from app.services.bedrock_ai import analyze_single_report

router = APIRouter()

#HELPERS

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def cluster_reports(reports, max_distance_km=80.0):
    clusters = []
    visited = set()
    for i, report in enumerate(reports):
        if i in visited:
            continue
        cluster = {
            "center_lat": report.latitude,
            "center_lon": report.longitude,
            "hazard_type": report.hazard_type,
            "severity": report.severity,
            "report_count": 1,
            "reports": [report.id]
        }
        visited.add(i)
        for j, other in enumerate(reports):
            if j not in visited and other.hazard_type == report.hazard_type:
                dist = calculate_distance(
                    report.latitude, report.longitude,
                    other.latitude, other.longitude
                )
                if dist <= max_distance_km:
                    cluster["report_count"] += 1
                    cluster["reports"].append(other.id)
                    visited.add(j)
                    n = cluster["report_count"]
                    cluster["center_lat"] = ((cluster["center_lat"] * (n - 1)) + other.latitude) / n
                    cluster["center_lon"] = ((cluster["center_lon"] * (n - 1)) + other.longitude) / n
                    if cluster["report_count"] >= 3:
                        cluster["severity"] = "critical"
        clusters.append(cluster)
    return clusters

def analyze_report_with_ai(report_id: int, text: str, image_url: str):
    db = SessionLocal()
    try:
        ml_api_url = "http://ml-service:8000/api/v1/analyze/report"
        with httpx.Client() as client:
            response = client.post(ml_api_url, json={
                "text": text,
                "image_url": image_url
            }, timeout=30.0)
            if response.status_code == 200:
                ai_data = response.json()
                report = db.query(Report).filter(Report.id == report_id).first()
                if report:
                    report.ai_authenticity_score = ai_data.get("credibility_score", 0.0)
                    report.ai_analysis_summary = ai_data.get("hazard_detected", "Analysis complete")
                    db.commit()
    except Exception as e:
        print(f"ML Service error: {e}")
    finally:
        db.close()

# ROUTES

# 1. GET STATS
@router.get("/stats")
def get_report_stats(db: Session = Depends(get_db)):
    total    = db.query(Report).count()
    pending  = db.query(Report).filter(Report.status == "pending").count()
    verified = db.query(Report).filter(Report.status == "verified").count()
    critical = db.query(Report).filter(Report.severity == "critical").count()
    return {
        "total_reports":    total,
        "pending_review":   pending,
        "verified_hazards": verified,
        "critical_alerts":  critical
    }

# 2. GET HOTSPOTS
@router.get("/hotspots")
def get_hazard_hotspots(
    db: Session = Depends(get_db),
    radius_km: float = Query(80.0)
):
    active_reports = db.query(Report).filter(Report.status != "false").all()
    if not active_reports:
        return {"message": "No active hazards", "hotspots": []}
    hotspots = cluster_reports(active_reports, max_distance_km=radius_km)
    hotspots.sort(key=lambda x: x["report_count"], reverse=True)
    return {
        "total_active_reports": len(active_reports),
        "total_hotspots": len(hotspots),
        "hotspots": hotspots
    }

# 3. GET MY REPORTS (logged-in user)
@router.get("/my", response_model=List[ReportResponse])
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    status: Optional[str] = Query(None)
):
    query = db.query(Report).filter(Report.user_id == current_user.id)
    if status:
        query = query.filter(Report.status == status)
    return query.order_by(Report.created_at.desc()).all()

# 4. GET ALL REPORTS
@router.get("/")
def read_reports(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None)
):
    query = db.query(Report)
    if status:
        query = query.filter(Report.status == status)
    if severity:
        query = query.filter(Report.severity == severity)
    reports = query.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for r in reports:
        d = ReportResponse.model_validate(r).model_dump()
        d["reporter_name"] = r.owner.full_name if r.owner else "Anonymous"
        result.append(d)
    return result

def score_single_report_bg(report_id: int, description: str, hazard_type: str, image_url: str, lat: float, lon: float):
    from app.db.session import SessionLocal
    from app.services.bedrock_ai import analyze_single_report
    db = SessionLocal()
    try:
        # Run the deep forensic analysis
        result = analyze_single_report(description, hazard_type, image_url, lat, lon)
        
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.ai_authenticity_score = result.get("authenticity_score", 0.5)
            report.ai_analysis_summary = result.get("preliminary_summary", "Analysis failed.")
            
            if result.get("recommended_status") == "false":
                report.status = "false"
                report.is_verified = False
                
            db.commit()
    except Exception as e:
        print(f"Background AI scoring failed: {e}")
    finally:
        db.close()

# 5. CREATE REPORT
@router.post("/", response_model=ReportResponse)
def create_report(
    *,
    db: Session = Depends(get_db),
    report_in: ReportCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_user)
):
    # Create the report
    report = crud_report.create_report(db=db, report=report_in, user_id=current_user.id)
    
    # Get image URL for AI analysis
    image_url = report.media[0].file_path if report.media else None
    
    # Schedule background AI analysis
    background_tasks.add_task(
        score_single_report_bg,
        report.id,
        report.description or "",
        report.hazard_type,
        image_url,
        report.latitude,
        report.longitude
    )
    
    return report

# DYNAMIC ROUTES

def serialize_report(r):
    d = ReportResponse.model_validate(r).model_dump()
    d["reporter_name"] = r.owner.full_name if r.owner else "Anonymous"
    return d

# 6. GET SINGLE REPORT
@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return serialize_report(report)

# 7. VERIFY REPORT (admin)
@router.patch("/{report_id}/verify", response_model=ReportResponse)
def verify_report(
    report_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = status
    report.is_verified = (status == "verified")
    db.commit()
    db.refresh(report)
    return report

# 8. DELETE REPORT
@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(report)
    db.commit()