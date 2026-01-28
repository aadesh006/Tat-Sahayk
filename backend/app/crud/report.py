from sqlalchemy.orm import Session
from app.models.report import Report
from app.schemas.report import ReportCreate
from app.models.user import User

def create_report(db: Session, report: ReportCreate, user_id: int):
    # Convert lat/lon to WKT (Well-Known Text) for PostGIS
    # PostGIS uses (Longitude, Latitude) order for points!
    location_wkt = f"POINT({report.longitude} {report.latitude})"
    
    db_report = Report(
        user_id=user_id,
        hazard_type=report.hazard_type,
        description=report.description,
        severity=report.severity,
        location=location_wkt,
        status="pending"
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def get_reports(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Report).offset(skip).limit(limit).all()