from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.report import Report
from typing import List

router = APIRouter()

@router.get("/map-reports")
def get_map_reports(db: Session = Depends(get_db)):
    """
    Optimized endpoint for map - returns only verified reports with minimal data
    No joins, no media, no comments - just coordinates and basic info
    """
    reports = db.query(Report).filter(
        Report.status == "verified",
        Report.location.isnot(None)
    ).all()
    
    # Return minimal data for map markers
    return [
        {
            "id": r.id,
            "hazard_type": r.hazard_type,
            "description": r.description,
            "severity": r.severity,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
        if r.latitude and r.longitude and r.latitude != 0 and r.longitude != 0
    ]
