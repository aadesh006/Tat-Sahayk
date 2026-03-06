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
from app.services.aws_services import send_otp_sms, generate_otp
from datetime import datetime, timedelta
from pydantic import BaseModel

GOOGLE_CLIENT_ID = "156193308727-aq2u3kv8u5t8oh5p7v8nc7s44asb095e.apps.googleusercontent.com"

router = APIRouter()

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

@router.post("/google", response_model=Token)
def google_login(payload: dict, db: Session = Depends(get_db)):
    """
    Google OAuth login endpoint - CITIZENS ONLY
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
    
    # Prevent admin accounts from using Google OAuth
    if email.endswith("@tatsahayk.gov.in"):
        raise HTTPException(
            status_code=403, 
            detail="Government accounts cannot use Google login. Please use the Admin portal."
        )
    
    # Find or create user
    user = crud_user.get_user_by_email(db, email=email)
    if not user:
        user = crud_user.create_user(db, user=UserCreate(
            email=email,
            full_name=name,
            password="google_oauth_no_password",  # placeholder - user won't use password login
        ))
    
    # Double-check user is not an admin
    if user.role == "admin":
        raise HTTPException(
            status_code=403, 
            detail="Admin accounts cannot use Google login. Please use the Admin portal."
        )
    
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
    
    # Check if admin is trying to login through citizen portal
    # Admin emails typically end with @tatsahayk.gov.in or have role="admin"
    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Admin accounts cannot login through citizen portal. Please use the Admin login."
        )
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/admin-login", response_model=Token)
def admin_login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    """Admin-only login endpoint"""
    user = crud_user.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    # Check if user is actually an admin
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="This portal is for government administrators only. Please use the Citizen login."
        )
    
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

# ── Phone Verification Endpoints ─────────────────────────────────────────────

@router.post("/send-otp")
def send_otp(
    request: OTPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Send OTP to user's phone number"""
    # Generate OTP
    otp = generate_otp()
    
    # Set expiry (10 minutes from now)
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Save OTP to database
    current_user.phone = request.phone
    current_user.otp_code = otp
    current_user.otp_expires_at = expires_at
    current_user.phone_verified = False
    db.commit()
    
    # Send SMS via AWS SNS
    success = send_otp_sms(request.phone, otp)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP. Please try again.")
    
    return {"message": "OTP sent successfully", "expires_in_minutes": 10}

@router.post("/verify-otp")
def verify_otp(
    request: OTPVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Verify OTP and mark phone as verified"""
    # Check if OTP exists and matches
    if not current_user.otp_code or current_user.otp_code != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check if OTP is expired
    if not current_user.otp_expires_at or current_user.otp_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    # Check if phone matches
    if current_user.phone != request.phone:
        raise HTTPException(status_code=400, detail="Phone number mismatch")
    
    # Mark phone as verified
    current_user.phone_verified = True
    current_user.otp_code = None  # Clear OTP
    current_user.otp_expires_at = None
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Phone verified successfully", "phone_verified": True}