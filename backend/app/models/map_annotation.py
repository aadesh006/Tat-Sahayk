from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class MapAnnotation(Base):
    __tablename__ = "map_annotations"
    id          = Column(Integer, primary_key=True, index=True)
    admin_id    = Column(Integer, ForeignKey("users.id"))
    type        = Column(String)   # rescue_center | affected_zone | evacuation_route | medical_camp
    title       = Column(String)
    description = Column(Text)
    latitude    = Column(Float)
    longitude   = Column(Float)
    radius_km   = Column(Float, nullable=True)   # for affected zones
    district    = Column(String, nullable=True)
    state       = Column(String, nullable=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    admin       = relationship("User")

class DeployedForce(Base):
    __tablename__ = "deployed_forces"
    id               = Column(Integer, primary_key=True, index=True)
    admin_id         = Column(Integer, ForeignKey("users.id"))
    unit_name        = Column(String)
    force_type       = Column(String)  # NDRF | Coast_Guard | Police | Medical | Army
    personnel_count  = Column(Integer, default=0)
    equipment        = Column(Text, nullable=True)
    latitude         = Column(Float)
    longitude        = Column(Float)
    district         = Column(String, nullable=True)
    status           = Column(String, default="active")  # active | standby | withdrawn
    deployed_at      = Column(DateTime(timezone=True), server_default=func.now())
    is_active        = Column(Boolean, default=True)
    admin            = relationship("User")