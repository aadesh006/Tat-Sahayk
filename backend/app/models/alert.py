from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Alert(Base):
    __tablename__ = "alerts"

    id           = Column(Integer, primary_key=True, index=True)
    admin_id     = Column(Integer, ForeignKey("users.id"))
    title        = Column(String,  nullable=False)
    message      = Column(Text,    nullable=False)
    hazard_type  = Column(String,  nullable=True)
    severity     = Column(String,  default="medium")  # low | medium | high | critical
    district     = Column(String,  nullable=True)     # target district
    state        = Column(String,  nullable=True)     # target state
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    expires_at   = Column(DateTime(timezone=True), nullable=True)

    issued_by_admin = relationship("User", back_populates="alerts")