from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.crud import report as crud_report
from app.schemas.report import ReportCreate, ReportResponse
from app.models.report import Report
from app.db.session import get_db
from app.models.user import User

router = APIRouter()

# 1. CREATE REPORT (Citizen)
@router.post("/", response_model=ReportResponse)
def create_report(
    *,
    db: Session = Depends(get_db),
    report_in: ReportCreate,
    current_user: User = Depends(deps.get_current_user)
):
    # Create a new hazard report.
    report = crud_report.create_report(db=db, report=report_in, user_id=current_user.id)
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