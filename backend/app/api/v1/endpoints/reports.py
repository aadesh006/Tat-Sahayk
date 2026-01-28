from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import report as crud_report
from app.schemas.report import ReportCreate, ReportResponse
from app.db.session import get_db
from app.models.user import User

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