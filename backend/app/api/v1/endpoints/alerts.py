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
    if current_user and current_user.role == "citizen":
        # Citizens see alerts for their location OR nationwide alerts (no district/state set)
        filters = []
        
        # Nationwide alerts (no district and no state)
        filters.append((Alert.district == None) & (Alert.state == None))
        
        # State-level alerts (matching state, no district)
        if current_user.state:
            filters.append((Alert.state == current_user.state) & (Alert.district == None))
        
        # District-level alerts (matching both district and state)
        if current_user.district and current_user.state:
            filters.append((Alert.district == current_user.district) & (Alert.state == current_user.state))
        
        from sqlalchemy import or_
        query = query.filter(or_(*filters))

    alerts = query.order_by(Alert.created_at.desc()).limit(20).all()

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
    # Jurisdiction validation: admins can only issue alerts for their own district/state
    target_district = alert_in.district or admin.district
    target_state = alert_in.state or admin.state
    
    # If admin has a district, they can only issue alerts for their district
    if admin.district:
        if target_district and target_district != admin.district:
            raise HTTPException(
                status_code=403, 
                detail=f"You can only issue alerts for your district: {admin.district}"
            )
    
    # If admin has a state, they can only issue alerts for their state
    if admin.state:
        if target_state and target_state != admin.state:
            raise HTTPException(
                status_code=403, 
                detail=f"You can only issue alerts for your state: {admin.state}"
            )
    
    alert = Alert(
        admin_id    = admin.id,
        title       = alert_in.title,
        message     = alert_in.message,
        hazard_type = alert_in.hazard_type,
        severity    = alert_in.severity,
        district    = target_district,
        state       = target_state,
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