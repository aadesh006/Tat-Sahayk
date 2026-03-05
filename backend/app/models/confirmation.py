from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class ReportConfirmation(Base):
    __tablename__ = "report_confirmations"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    report = relationship("Report", back_populates="confirmations")
    user = relationship("User", foreign_keys=[user_id])
    
    # Ensure one user can only confirm a report once
    __table_args__ = (
        UniqueConstraint('report_id', 'user_id', name='unique_user_report_confirmation'),
    )
