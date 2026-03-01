from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.crud import user as crud_user
from app.schemas.user import UserCreate, UserResponse, Token
from app.db.session import get_db
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.api import deps
from app.models.user import User

router = APIRouter()

@router.post("/signup", response_model=UserResponse)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = crud_user.create_user(db, user=user_in)
    return user

@router.post("/login", response_model=Token)
def login_for_access_token(
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    #Find the user (Swagger sends email in the 'username' field)
    user = crud_user.get_user_by_email(db, email=form_data.username)
    
    # Check if user exists and password matches
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    #Create the Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(deps.get_current_user)):
    return current_user