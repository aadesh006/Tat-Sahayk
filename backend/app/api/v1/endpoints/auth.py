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
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

GOOGLE_CLIENT_ID = "156193308727-aq2u3kv8u5t8oh5p7v8nc7s44asb095e.apps.googleusercontent.com"

router = APIRouter()

@router.post("/google", response_model=Token)
def google_login(payload: dict, db: Session = Depends(get_db)):
    """
    Google OAuth login endpoint
    Accepts Google ID token, verifies it, and creates/logs in user
    """
    credential = payload.get("credential")
    if not credential:
        raise HTTPException(status_code=400, detail="Missing credential")
    
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    
    email = idinfo.get("email")
    name = idinfo.get("name", email.split("@")[0])
    
    # Find or create user
    user = crud_user.get_user_by_email(db, email=email)
    if not user:
        user = crud_user.create_user(db, user=UserCreate(
            email=email,
            full_name=name,
            password="google_oauth_no_password",  # placeholder - user won't use password login
        ))
    
    # Issue JWT token - same as normal login
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

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