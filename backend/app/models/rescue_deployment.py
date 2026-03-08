from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class RescueDeployment(Base):
    __tablename__ = "rescue_deployments"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=True)  # Made optional
    team_name = Column(String(200), nullable=False)  # e.g., "NDRF Team Alpha"
    unit_count = Column(Integer, nullable=False)  # Number of units deployed
    personnel_count = Column(Integer, nullable=True)  # Number of personnel
    equipment = Column(Text, nullable=True)  # Equipment details
    status = Column(String(50), default="deployed")  # deployed, en_route, completed
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    deployed_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    # Relationship
    report = relationship("Report", back_populates="rescue_deployments")


class Shelter(Base):
    __tablename__ = "shelters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=False)  # Max capacity
    current_occupancy = Column(Integer, default=0)  # Current occupancy
    contact_phone = Column(String(20), nullable=True)
    contact_person = Column(String(100), nullable=True)
    facilities = Column(Text, nullable=True)  # JSON string of facilities
    status = Column(String(50), default="active")  # active, full, closed
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
