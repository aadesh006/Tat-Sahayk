from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.crud import user as crud_user
from app.schemas.user import UserCreate, UserResponse, Token, UserUpdate
from app.db.session import get_db
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.models.user import User
from app.api import deps

router = APIRouter()

@router.post("/signup", response_model=UserResponse)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud_user.create_user(db, user=user_in)

@router.post("/login", response_model=Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud_user.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(deps.get_current_user)):
    return current_user

@router.patch("/me", response_model=UserResponse)
def update_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    return crud_user.update_user(db, user=current_user, update=user_in)

@router.patch("/update-location")
def update_user_location(
    district: str,
    state: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Update user's location (district and state) for location-based alerts"""
    current_user.district = district
    current_user.state = state
    db.commit()
    db.refresh(current_user)
    return {"message": "Location updated successfully", "district": district, "state": state}