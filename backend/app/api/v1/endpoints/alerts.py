from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.api import deps
from app.models.user  import User
from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertResponse
from app.services.citizen_alerts import get_location_based_alerts

router = APIRouter()

def require_admin(current_user: User = Depends(deps.get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# NEW: Get location-based alerts for citizens
@router.get("/location-based")
def get_citizen_location_alerts(
    latitude: float = Query(..., description="Citizen's current latitude"),
    longitude: float = Query(..., description="Citizen's current longitude"),
    radius_km: float = Query(50.0, description="Search radius in kilometers"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
):
    """
    Get comprehensive location-based alerts for citizens.
    Returns red zones, safe sites, admin alerts, and evacuation recommendations.
    """
    return get_location_based_alerts(db, latitude, longitude, radius_km)

# GET alerts — filtered by user's location (district/state) or all if not authenticated
@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
):
    query = db.query(Alert).filter(Alert.is_active == True)

    # Filter alerts based on user's location
    if current_user:
        # Both citizens AND admins see location-filtered alerts
        filters = []
        
        # Nationwide alerts (no district and no state)
        filters.append((Alert.district == None) & (Alert.state == None))
        
        # State-level alerts (matching state, no district)
        if current_user.state:
            filters.append((Alert.state == current_user.state) & (Alert.district == None))
        
        # District-level alerts (use ilike for partial matching like reports)
        if current_user.district and current_user.state:
            filters.append(
                Alert.district.ilike(f"%{current_user.district}%") & 
                (Alert.state == current_user.state)
            )
        
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
    
    # Authorization checks:
    # 1. Admins can only deactivate their own alerts
    if alert.admin_id != admin.id:
        raise HTTPException(
            status_code=403, 
            detail="You can only deactivate alerts you created"
        )
    
    # 2. District admins cannot deactivate national alerts
    # National alerts have no district and no state
    is_national_alert = (alert.district is None and alert.state is None)
    is_district_admin = (admin.district is not None)
    
    if is_national_alert and is_district_admin:
        raise HTTPException(
            status_code=403, 
            detail="District admins cannot deactivate national alerts"
        )
    
    # 3. District admins can only deactivate alerts for their district
    if admin.district:
        if alert.district and alert.district != admin.district:
            raise HTTPException(
                status_code=403, 
                detail=f"You can only deactivate alerts for your district: {admin.district}"
            )
    
    alert.is_active = False
    db.commit()
    return {"message": "Alert deactivated"}


# DELETE alert (permanent deletion)
@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    db:       Session = Depends(get_db),
    admin:    User    = Depends(require_admin)
):
    """
    Permanently delete an alert or circular.
    Admins can only delete their own alerts/circulars.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Authorization: Admins can only delete their own alerts
    if alert.admin_id != admin.id:
        raise HTTPException(
            status_code=403, 
            detail="You can only delete alerts you created"
        )
    
    # Delete the alert
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully"}


# NEW: Create informational circular/announcement (admin only)
@router.post("/circular", response_model=AlertResponse)
def create_circular(
    title: str = Query(..., description="Circular title"),
    message: str = Query(..., description="Circular message/content"),
    severity: str = Query("low", description="Severity: low/medium/high/critical"),
    district: Optional[str] = Query(None, description="Target district"),
    state: Optional[str] = Query(None, description="Target state"),
    expires_at: Optional[datetime] = Query(None, description="Expiration date/time"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Create informational circular for citizens.
    Examples:
    - "Bridge on Highway 47 damaged - use alternate route via Highway 52"
    - "Relief supplies being distributed at Community Center from 10 AM"
    - "Medical teams deployed to affected areas - contact 1078 for assistance"
    - "Power restoration expected by 6 PM today in affected districts"
    """
    # Jurisdiction validation
    target_district = district or admin.district
    target_state = state or admin.state
    
    if admin.district and target_district and target_district != admin.district:
        raise HTTPException(
            status_code=403,
            detail=f"You can only create circulars for your district: {admin.district}"
        )
    
    if admin.state and target_state and target_state != admin.state:
        raise HTTPException(
            status_code=403,
            detail=f"You can only create circulars for your state: {admin.state}"
        )
    
    # Create circular as an alert with hazard_type="info"
    circular = Alert(
        admin_id=admin.id,
        title=title,
        message=message,
        hazard_type="info",  # Special type for circulars
        severity=severity,
        district=target_district,
        state=target_state,
        expires_at=expires_at,
        is_active=True
    )
    
    db.add(circular)
    db.commit()
    db.refresh(circular)
    
    return AlertResponse(
        id=circular.id,
        admin_id=circular.admin_id,
        title=circular.title,
        message=circular.message,
        hazard_type=circular.hazard_type,
        severity=circular.severity,
        district=circular.district,
        state=circular.state,
        is_active=circular.is_active,
        created_at=circular.created_at,
        expires_at=circular.expires_at,
        admin_name=admin.full_name
    )


# GET: List all circulars/info announcements
@router.get("/circulars", response_model=List[AlertResponse])
def get_circulars(
    active_only: bool = Query(True, description="Only show active circulars"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
):
    """
    Get all informational circulars.
    Both citizens and admins see circulars for their location.
    """
    query = db.query(Alert).filter(Alert.hazard_type == "info")
    
    if active_only:
        query = query.filter(Alert.is_active == True)
    
    # Filter by location for all authenticated users (citizens AND admins)
    if current_user:
        filters = []
        
        # Nationwide circulars
        filters.append((Alert.district == None) & (Alert.state == None))
        
        # State-level circulars
        if current_user.state:
            filters.append((Alert.state == current_user.state) & (Alert.district == None))
        
        # District-level circulars (use ilike for partial matching)
        if current_user.district and current_user.state:
            filters.append(
                Alert.district.ilike(f"%{current_user.district}%") & 
                (Alert.state == current_user.state)
            )
        
        from sqlalchemy import or_
        query = query.filter(or_(*filters))
    
    circulars = query.order_by(Alert.created_at.desc()).limit(50).all()
    
    result = []
    for c in circulars:
        result.append(AlertResponse(
            id=c.id,
            admin_id=c.admin_id,
            title=c.title,
            message=c.message,
            hazard_type=c.hazard_type,
            severity=c.severity,
            district=c.district,
            state=c.state,
            is_active=c.is_active,
            created_at=c.created_at,
            expires_at=c.expires_at,
            admin_name=c.issued_by_admin.full_name if c.issued_by_admin else "System"
        ))
    
    return result
