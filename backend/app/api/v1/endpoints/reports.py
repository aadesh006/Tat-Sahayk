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
from app.services.aws_services import send_disaster_alert_email
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID

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

def send_disaster_alerts_to_nearby_users(
    report_id: int,
    hazard_type: str,
    report_lat: float,
    report_lon: float,
    severity: str,
    description: str,
    radius_km: float = 100.0  # Alert users within 100km
):
    """Send email alerts to users near the disaster location"""
    db = SessionLocal()
    try:
        # Get all users with verified emails and phone numbers (active citizens)
        users = db.query(User).filter(
            User.role == "citizen",
            User.is_active == True,
            User.email.isnot(None)
        ).all()
        
        # Find users within radius
        alerted_count = 0
        for user in users:
            # Skip if user doesn't have location set
            if not user.district or not user.state:
                continue
            
            # For now, send to all users in the same state
            # TODO: Implement proper distance calculation based on user's exact location
            # For MVP, we'll use state-level filtering
            
            # Get report owner's state (if available)
            report = db.query(Report).filter(Report.id == report_id).first()
            if not report or not report.owner:
                continue
                
            report_state = report.owner.state
            
            # Send email if user is in the same state
            if user.state == report_state:
                location_str = f"{report_lat:.4f}°N, {report_lon:.4f}°E"
                success = send_disaster_alert_email(
                    to_email=user.email,
                    user_name=user.full_name or "User",
                    disaster_type=hazard_type,
                    location=location_str,
                    severity=severity,
                    description=description
                )
                if success:
                    alerted_count += 1
        
        print(f"✓ Sent {alerted_count} disaster alert emails")
    except Exception as e:
        print(f"Error sending disaster alerts: {e}")
    finally:
        db.close()

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

# 1. GET STATS (SOS TRIGGERS)
@router.get("/stats")
def get_report_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    from app.models.confirmation import ReportConfirmation
    
    # Base query
    query = db.query(Report)
    
    # Filter by admin's district if admin role
    if current_user.role == "admin" and current_user.district:
        query = query.filter(Report.district.ilike(f"%{current_user.district}%"))
    
    # Get SOS triggers (critical severity reports)
    sos_triggers = query.filter(Report.severity == "critical").all()
    
    # Get active hazards by type
    hazard_counts = {}
    for report in query.filter(Report.status != "false").all():
        hazard_counts[report.hazard_type] = hazard_counts.get(report.hazard_type, 0) + 1
    
    return {
        "sos_triggers": [
            {
                "id": r.id,
                "hazard_type": r.hazard_type,
                "description": r.description,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "created_at": r.created_at,
                "reporter_name": r.owner.full_name if r.owner else "Anonymous",
                "reporter_profile_photo": r.owner.profile_photo if r.owner else None,
                "user_confirmed": db.query(ReportConfirmation).filter(
                    ReportConfirmation.report_id == r.id,
                    ReportConfirmation.user_id == current_user.id
                ).first() is not None
            }
            for r in sos_triggers
        ],
        "total_sos": len(sos_triggers),
        "hazard_breakdown": hazard_counts,
        "total_active": query.filter(Report.status != "false").count()
    }

# 2. GET HOTSPOTS
@router.get("/hotspots")
def get_hazard_hotspots(
    db: Session = Depends(get_db),
    radius_km: float = Query(80.0),
    current_user: User = Depends(deps.get_current_user)
):
    # Filter reports by admin's district if admin role
    query = db.query(Report).filter(Report.status != "false")
    if current_user.role == "admin" and current_user.district:
        # Admin sees only reports in their district (partial match)
        query = query.filter(Report.district.ilike(f"%{current_user.district}%"))
    
    active_reports = query.all()
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
    from app.models.confirmation import ReportConfirmation
    
    query = db.query(Report).filter(Report.user_id == current_user.id)
    if status:
        query = query.filter(Report.status == status)
    
    reports = query.order_by(Report.created_at.desc()).all()
    result = []
    for r in reports:
        d = ReportResponse.model_validate(r).model_dump()
        d["reporter_name"] = r.owner.full_name if r.owner else "Anonymous"
        d["reporter_profile_photo"] = r.owner.profile_photo if r.owner else None
        
        # Add user_confirmed field
        confirmed = db.query(ReportConfirmation).filter(
            ReportConfirmation.report_id == r.id,
            ReportConfirmation.user_id == current_user.id
        ).first() is not None
        d["user_confirmed"] = confirmed
        
        result.append(d)
    return result

# 4. GET ALL REPORTS
@router.get("/")
def read_reports(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    all_reports: bool = Query(False),  # New parameter to bypass district filtering
    current_user: User = Depends(deps.get_current_user_optional),  # optional auth
):
    from app.models.confirmation import ReportConfirmation
    
    query = db.query(Report)
    if status:
        query = query.filter(Report.status == status)
    if severity:
        query = query.filter(Report.severity == severity)

    # Admin sees only their district's reports UNLESS all_reports=true (for home page)
    if current_user and current_user.role == "admin" and current_user.district and not all_reports:
        # Use ilike for partial matching (e.g., "Mumbai" matches "Mumbai Suburban")
        query = query.filter(Report.district.ilike(f"%{current_user.district}%"))

    reports = query.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for r in reports:
        d = ReportResponse.model_validate(r).model_dump()
        d["reporter_name"] = r.owner.full_name if r.owner else "Anonymous"
        d["reporter_profile_photo"] = r.owner.profile_photo if r.owner else None
        
        # Add user_confirmed field if user is authenticated
        if current_user:
            confirmed = db.query(ReportConfirmation).filter(
                ReportConfirmation.report_id == r.id,
                ReportConfirmation.user_id == current_user.id
            ).first() is not None
            d["user_confirmed"] = confirmed
        else:
            d["user_confirmed"] = False
        
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
    from app.services.geocode import get_district_from_coords
    
    # Create the report
    report = crud_report.create_report(db=db, report=report_in, user_id=current_user.id)
    
    # Get image URL for AI analysis
    image_url = report.media[0].file_path if report.media else None
    
    # Move geocoding to background task for faster response
    if report.latitude and report.longitude:
        background_tasks.add_task(
            update_report_district_bg,
            report.id,
            report.latitude,
            report.longitude
        )
    
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


def update_report_district_bg(report_id: int, latitude: float, longitude: float):
    """Background task to update report district via reverse geocoding"""
    from app.db.session import SessionLocal
    from app.services.geocode import get_district_from_coords
    
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            district = get_district_from_coords(latitude, longitude)
            if district:
                report.district = district
                db.commit()
    except Exception as e:
        logger.error(f"Failed to update district for report {report_id}: {e}")
    finally:
        db.close()

# DYNAMIC ROUTES

def serialize_report(r, current_user=None):
    from app.models.confirmation import ReportConfirmation
    from app.db.session import SessionLocal
    
    d = ReportResponse.model_validate(r).model_dump()
    d["reporter_name"] = r.owner.full_name if r.owner else "Anonymous"
    d["reporter_profile_photo"] = r.owner.profile_photo if r.owner else None
    
    # Add user_confirmed field if user is authenticated
    if current_user:
        db = SessionLocal()
        try:
            confirmed = db.query(ReportConfirmation).filter(
                ReportConfirmation.report_id == r.id,
                ReportConfirmation.user_id == current_user.id
            ).first() is not None
            d["user_confirmed"] = confirmed
        finally:
            db.close()
    else:
        d["user_confirmed"] = False
    
    return d

# 6. GET SINGLE REPORT
@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user_optional)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return serialize_report(report, current_user)

# 7. VERIFY REPORT (admin) - Send email alerts to nearby users
@router.patch("/{report_id}/verify", response_model=ReportResponse)
def verify_report(
    report_id: int,
    status: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    old_status = report.status
    report.status = status
    report.is_verified = (status == "verified")
    db.commit()
    db.refresh(report)
    
    # If report is being verified (not already verified), send email alerts
    if status == "verified" and old_status != "verified":
        background_tasks.add_task(
            send_disaster_alerts_to_nearby_users,
            report.id,
            report.hazard_type,
            report.latitude,
            report.longitude,
            report.severity,
            report.description or "No description provided"
        )
    
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

# 9. CONFIRM REPORT (Like/Upvote)
@router.post("/{report_id}/confirm")
def confirm_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    from app.models.confirmation import ReportConfirmation
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check if user already confirmed
    existing = db.query(ReportConfirmation).filter(
        ReportConfirmation.report_id == report_id,
        ReportConfirmation.user_id == current_user.id
    ).first()
    
    if existing:
        # Remove confirmation (unlike)
        db.delete(existing)
        report.confirmation_count = max(0, report.confirmation_count - 1)
        db.commit()
        return {"message": "Confirmation removed", "confirmation_count": report.confirmation_count, "confirmed": False}
    else:
        # Add confirmation
        confirmation = ReportConfirmation(
            report_id=report_id,
            user_id=current_user.id
        )
        db.add(confirmation)
        report.confirmation_count += 1
        db.commit()
        return {"message": "Report confirmed", "confirmation_count": report.confirmation_count, "confirmed": True}

# 10. CHECK IF USER CONFIRMED REPORT
@router.get("/{report_id}/confirmed")
def check_confirmation(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    from app.models.confirmation import ReportConfirmation
    
    confirmed = db.query(ReportConfirmation).filter(
        ReportConfirmation.report_id == report_id,
        ReportConfirmation.user_id == current_user.id
    ).first() is not None
    
    report = db.query(Report).filter(Report.id == report_id).first()
    confirmation_count = report.confirmation_count if report else 0
    
    return {"confirmed": confirmed, "confirmation_count": confirmation_count}