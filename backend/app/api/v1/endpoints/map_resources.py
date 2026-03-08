from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.rescue_deployment import RescueDeployment, Shelter
from pydantic import BaseModel

router = APIRouter()

# Schemas
class RescueDeploymentCreate(BaseModel):
    report_id: Optional[int] = None
    team_name: str
    unit_count: int
    personnel_count: Optional[int] = None
    equipment: Optional[str] = None
    latitude: float
    longitude: float
    notes: Optional[str] = None

class RescueDeploymentUpdate(BaseModel):
    status: Optional[str] = None
    unit_count: Optional[int] = None
    personnel_count: Optional[int] = None
    equipment: Optional[str] = None
    notes: Optional[str] = None

class ShelterCreate(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    capacity: int
    current_occupancy: int = 0
    contact_phone: Optional[str] = None
    contact_person: Optional[str] = None
    facilities: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None

class ShelterUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    capacity: Optional[int] = None
    current_occupancy: Optional[int] = None
    contact_phone: Optional[str] = None
    contact_person: Optional[str] = None
    facilities: Optional[str] = None
    status: Optional[str] = None


# RESCUE DEPLOYMENTS

@router.post("/deployments")
def create_deployment(
    deployment: RescueDeploymentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.get_current_user)
):
    """Admin creates a rescue deployment"""
    try:
        if admin.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Create deployment data
        deployment_data = deployment.dict()
        
        # Remove report_id if it's 0 or None
        if not deployment_data.get('report_id'):
            deployment_data['report_id'] = None
        
        new_deployment = RescueDeployment(**deployment_data)
        db.add(new_deployment)
        db.commit()
        db.refresh(new_deployment)
        
        return new_deployment
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/deployments")
def get_deployments(
    status: str = None,
    db: Session = Depends(get_db)
):
    """Get all rescue deployments"""
    query = db.query(RescueDeployment)
    if status:
        query = query.filter(RescueDeployment.status == status)
    return query.all()


@router.patch("/deployments/{deployment_id}")
def update_deployment(
    deployment_id: int,
    deployment: RescueDeploymentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.get_current_user)
):
    """Admin updates a rescue deployment"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db_deployment = db.query(RescueDeployment).filter(RescueDeployment.id == deployment_id).first()
    if not db_deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    for key, value in deployment.dict(exclude_unset=True).items():
        setattr(db_deployment, key, value)
    
    db.commit()
    db.refresh(db_deployment)
    return db_deployment


@router.delete("/deployments/{deployment_id}")
def delete_deployment(
    deployment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.get_current_user)
):
    """Admin deletes a rescue deployment"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db_deployment = db.query(RescueDeployment).filter(RescueDeployment.id == deployment_id).first()
    if not db_deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    
    db.delete(db_deployment)
    db.commit()
    return {"message": "Deployment deleted"}


# SHELTERS

@router.post("/shelters")
def create_shelter(
    shelter: ShelterCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.get_current_user)
):
    """Admin creates a shelter"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    new_shelter = Shelter(**shelter.dict())
    db.add(new_shelter)
    db.commit()
    db.refresh(new_shelter)
    return new_shelter


@router.get("/shelters")
def get_shelters(
    status: str = None,
    db: Session = Depends(get_db)
):
    """Get all shelters"""
    query = db.query(Shelter)
    if status:
        query = query.filter(Shelter.status == status)
    return query.all()


@router.patch("/shelters/{shelter_id}")
def update_shelter(
    shelter_id: int,
    shelter: ShelterUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.get_current_user)
):
    """Admin updates a shelter"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db_shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not db_shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")
    
    for key, value in shelter.dict(exclude_unset=True).items():
        setattr(db_shelter, key, value)
    
    db.commit()
    db.refresh(db_shelter)
    return db_shelter


@router.delete("/shelters/{shelter_id}")
def delete_shelter(
    shelter_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(deps.get_current_user)
):
    """Admin deletes a shelter"""
    if admin.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db_shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not db_shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")
    
    db.delete(db_shelter)
    db.commit()
    return {"message": "Shelter deleted"}
