from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.db.session import get_db
from app.api import deps
from app.models.user           import User
from app.models.map_annotation import MapAnnotation, DeployedForce
from app.models.report         import Report
from geoalchemy2.shape         import to_shape

router = APIRouter()

def require_admin(current_user: User = Depends(deps.get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user

# ── Schemas ──────────────────────────────────────────────────────────────────
class AnnotationCreate(BaseModel):
    type:        str
    title:       str
    description: Optional[str] = None
    latitude:    float
    longitude:   float
    radius_km:   Optional[float] = None
    district:    Optional[str]   = None

class ForceCreate(BaseModel):
    unit_name:       str
    force_type:      str
    personnel_count: int = 0
    equipment:       Optional[str] = None
    latitude:        float
    longitude:       float
    district:        Optional[str] = None
    status:          str = "active"

class ForceUpdate(BaseModel):
    personnel_count: Optional[int] = None
    status:          Optional[str] = None
    equipment:       Optional[str] = None

# ── Map data endpoint (public — for citizen map page) ────────────────────────
@router.get("/data")
def get_map_data(db: Session = Depends(get_db)):
    """
    Returns everything needed to render the full map:
    - Verified report clusters
    - Rescue centers / affected zones
    - Deployed forces (anonymized count only for citizens)
    """
    # 1. Verified reports clustered
    verified_reports = db.query(Report).filter(
        Report.status == "verified"
    ).all()

    report_points = []
    for r in verified_reports:
        if r.location:
            shape = to_shape(r.location)
            report_points.append({
                "id":           r.id,
                "lat":          shape.y,
                "lon":          shape.x,
                "hazard_type":  r.hazard_type,
                "severity":     r.severity,
                "description":  r.description,
                "created_at":   r.created_at.isoformat() if r.created_at else None,
                "ai_score":     r.ai_authenticity_score,
            })

    # 2. Admin annotations
    annotations = db.query(MapAnnotation).filter(
        MapAnnotation.is_active == True
    ).all()

    annotation_data = [{
        "id":          a.id,
        "type":        a.type,
        "title":       a.title,
        "description": a.description,
        "lat":         a.latitude,
        "lon":         a.longitude,
        "radius_km":   a.radius_km,
        "district":    a.district,
    } for a in annotations]

    # 3. Deployed forces (public summary only)
    forces = db.query(DeployedForce).filter(
        DeployedForce.is_active == True
    ).all()

    force_data = [{
        "id":              f.id,
        "unit_name":       f.unit_name,
        "force_type":      f.force_type,
        "personnel_count": f.personnel_count,
        "lat":             f.latitude,
        "lon":             f.longitude,
        "status":          f.status,
        "district":        f.district,
    } for f in forces]

    return {
        "verified_reports":  report_points,
        "annotations":       annotation_data,
        "deployed_forces":   force_data,
    }

# ── Admin: Annotations CRUD ──────────────────────────────────────────────────
@router.post("/annotations")
def add_annotation(
    data:  AnnotationCreate,
    db:    Session = Depends(get_db),
    admin: User    = Depends(require_admin)
):
    ann = MapAnnotation(
        admin_id    = admin.id,
        type        = data.type,
        title       = data.title,
        description = data.description,
        latitude    = data.latitude,
        longitude   = data.longitude,
        radius_km   = data.radius_km,
        district    = data.district or admin.district,
        state       = admin.state,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return {"id": ann.id, "message": "Annotation added"}

@router.delete("/annotations/{ann_id}")
def remove_annotation(
    ann_id: int,
    db:     Session = Depends(get_db),
    admin:  User    = Depends(require_admin)
):
    ann = db.query(MapAnnotation).filter(MapAnnotation.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Not found")
    ann.is_active = False
    db.commit()
    return {"message": "Removed"}

# ── Admin: Deployed Forces CRUD ──────────────────────────────────────────────
@router.get("/forces")
def get_forces(
    db:    Session = Depends(get_db),
    admin: User    = Depends(require_admin)
):
    forces = db.query(DeployedForce).filter(
        DeployedForce.is_active == True
    ).all()
    return [{
        "id":              f.id,
        "unit_name":       f.unit_name,
        "force_type":      f.force_type,
        "personnel_count": f.personnel_count,
        "equipment":       f.equipment,
        "lat":             f.latitude,
        "lon":             f.longitude,
        "status":          f.status,
        "district":        f.district,
        "deployed_at":     f.deployed_at.isoformat() if f.deployed_at else None,
    } for f in forces]

@router.post("/forces")
def deploy_force(
    data:  ForceCreate,
    db:    Session = Depends(get_db),
    admin: User    = Depends(require_admin)
):
    force = DeployedForce(
        admin_id         = admin.id,
        unit_name        = data.unit_name,
        force_type       = data.force_type,
        personnel_count  = data.personnel_count,
        equipment        = data.equipment,
        latitude         = data.latitude,
        longitude        = data.longitude,
        district         = data.district or admin.district,
        status           = data.status,
    )
    db.add(force)
    db.commit()
    db.refresh(force)
    return {"id": force.id, "message": "Force deployed"}

@router.patch("/forces/{force_id}")
def update_force(
    force_id: int,
    data:     ForceUpdate,
    db:       Session = Depends(get_db),
    admin:    User    = Depends(require_admin)
):
    force = db.query(DeployedForce).filter(DeployedForce.id == force_id).first()
    if not force:
        raise HTTPException(status_code=404, detail="Not found")
    if data.personnel_count is not None:
        force.personnel_count = data.personnel_count
    if data.status is not None:
        force.status = data.status
    if data.equipment is not None:
        force.equipment = data.equipment
    db.commit()
    return {"message": "Updated"}

@router.delete("/forces/{force_id}")
def withdraw_force(
    force_id: int,
    db:       Session = Depends(get_db),
    admin:    User    = Depends(require_admin)
):
    force = db.query(DeployedForce).filter(DeployedForce.id == force_id).first()
    if not force:
        raise HTTPException(status_code=404, detail="Not found")
    force.is_active = False
    db.commit()
    return {"message": "Force withdrawn"}