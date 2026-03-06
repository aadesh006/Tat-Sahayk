from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.api import deps
from app.models.user  import User
from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertResponse

router = APIRouter()

def require_admin(current_user: User = Depends(deps.get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# GET alerts — filtered by user's location (district/state) or all if not authenticated
@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
):
    query = db.query(Alert).filter(Alert.is_active == True)

    # Filter alerts based on user's location if authenticated
    if current_user:
        if current_user.district:
            # Show alerts for user's district OR nationwide (no district set)
            query = query.filter(
                (Alert.district == current_user.district) | (Alert.district == None)
            )
        if current_user.state:
            query = query.filter(
                (Alert.state == current_user.state) | (Alert.state == None)
            )

    alerts = query.order_by(Alert.created_at.desc()).limit(10).all()

    result = []
    for a in alerts:
        result.append(AlertResponse(
            id=a.id, admin_id=a.admin_id, title=a.title, message=a.message,
            hazard_type=a.hazard_type, severity=a.severity,
            district=a.district, state=a.state,
            is_active=a.is_active, created_at=a.created_at,
            expires_at=a.expires_at,
            admin_name=a.issued_by_admin.full_name if a.issued_by_admin else "System"
        ))
    return result

# POST — issue new alert (admin only)
@router.post("/", response_model=AlertResponse)
def create_alert(
    alert_in: AlertCreate,
    db:       Session = Depends(get_db),
    admin:    User    = Depends(require_admin)
):
    alert = Alert(
        admin_id    = admin.id,
        title       = alert_in.title,
        message     = alert_in.message,
        hazard_type = alert_in.hazard_type,
        severity    = alert_in.severity,
        district    = alert_in.district or admin.district,
        state       = alert_in.state    or admin.state,
        expires_at  = alert_in.expires_at,
        is_active   = True
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    return AlertResponse(
        id=alert.id, admin_id=alert.admin_id, title=alert.title,
        message=alert.message, hazard_type=alert.hazard_type,
        severity=alert.severity, district=alert.district,
        state=alert.state, is_active=alert.is_active,
        created_at=alert.created_at, expires_at=alert.expires_at,
        admin_name=admin.full_name
    )

# DEACTIVATE alert
@router.patch("/{alert_id}/deactivate")
def deactivate_alert(
    alert_id: int,
    db:       Session = Depends(get_db),
    admin:    User    = Depends(require_admin)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.admin_id != admin.id and admin.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    alert.is_active = False
    db.commit()
    return {"message": "Alert deactivated"}