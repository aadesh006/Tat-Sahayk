from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="citizen")
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    profile_photo = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    phone = Column(String, nullable=True)
    phone_verified = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    otp_attempt_count = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    otp_last_sent_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    is_active = Column(Boolean, default=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    reports = relationship("Report", back_populates="owner")
    alerts = relationship(
        "Alert",
        back_populates="issued_by_admin",
    )
