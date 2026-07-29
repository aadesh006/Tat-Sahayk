from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "citizen"
    district: Optional[str] = None
    state: Optional[str] = None
    profile_photo: Optional[str] = None
    phone: Optional[str] = None
    phone_verified: bool = False


class UserCreate(UserBase):
    password: str
    phone: Optional[str] = None


class UserSignup(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str = Field(min_length=6, max_length=128)

    model_config = ConfigDict(extra="forbid")


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_photo: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str