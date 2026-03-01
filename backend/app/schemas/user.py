from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email:     EmailStr
    full_name: Optional[str] = None
    role:      str = "citizen"
    district:  Optional[str] = None
    state:     Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None

class UserResponse(UserBase):
    id:         int
    is_active:  bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type:   str