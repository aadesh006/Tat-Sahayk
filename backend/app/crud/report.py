from sqlalchemy.orm import Session
from app.models.report import Report
from app.models.media import Media
from app.schemas.report import ReportCreate

def create_report(db: Session, report: ReportCreate, user_id: int):
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

    #Link the Images (If any)
    if report.image_filenames:
        for filename in report.image_filenames:
            # Construct the path (assuming they are in 'uploads/')
            file_path = f"uploads/{filename}"
            
            db_media = Media(
                report_id=db_report.id,
                file_path=file_path,
                file_type="image/jpeg" # Defaulting for now
            )
            db.add(db_media)
        
        db.commit()
        db.refresh(db_report) # Refresh to get the media relationship loaded

    return db_report

def get_reports(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Report).offset(skip).limit(limit).all()