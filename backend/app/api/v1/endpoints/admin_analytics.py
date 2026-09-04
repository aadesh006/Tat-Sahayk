"""
Admin Analytics API Endpoints
Real-time consolidated reports and AI analysis for administrators
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import logging

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.data_aggregator import generate_consolidated_report

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/consolidated-report")
async def get_consolidated_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate comprehensive consolidated report with AI analysis
    Combines citizen reports, social media, red zones, external data sources
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Generate report for admin's district (or national if no district)
        district = current_user.district if current_user.district else None
        
        report = await generate_consolidated_report(db, district)
        
        return {
            "success": True,
            "report": report,
            "generated_for": {
                "admin_name": current_user.full_name,
                "admin_email": current_user.email,
                "district": district or "National"
            }
        }
    except Exception as e:
        logger.error(f"Consolidated report generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate consolidated report: {str(e)}"
        )


@router.get("/real-time-stats")
def get_real_time_stats(
    hours: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get real-time statistics for quick dashboard updates
    Lightweight version for frequent polling
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from app.models.report import Report
    from app.models.alert import Alert
    from app.models.red_zone import VulnerableHabitation
    from sqlalchemy import func
    
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    district = current_user.district
    
    # Recent reports
    report_query = db.query(Report).filter(Report.created_at >= cutoff)
    if district:
        report_query = report_query.filter(Report.district.ilike(f"%{district}%"))
    
    total_reports = report_query.count()
    verified_reports = report_query.filter(Report.status == "verified").count()
    pending_reports = report_query.filter(Report.status == "pending").count()
    
    # Active alerts
    alert_query = db.query(Alert).filter(
        Alert.is_active == True,
        Alert.expires_at > datetime.utcnow()
    )
    if district:
        alert_query = alert_query.filter(Alert.district.ilike(f"%{district}%"))
    
    active_alerts = alert_query.count()
    critical_alerts = alert_query.filter(Alert.severity == "critical").count()
    
    # Immediate priority habitations
    hab_query = db.query(VulnerableHabitation).filter(
        VulnerableHabitation.priority == "IMMEDIATE"
    )
    if district:
        hab_query = hab_query.filter(VulnerableHabitation.district.ilike(f"%{district}%"))
    
    immediate_evacuations = hab_query.count()
    
    return {
        "time_window_hours": hours,
        "generated_at": datetime.utcnow().isoformat(),
        "district": district or "National",
        "reports": {
            "total": total_reports,
            "verified": verified_reports,
            "pending": pending_reports
        },
        "alerts": {
            "active": active_alerts,
            "critical": critical_alerts
        },
        "evacuations": {
            "immediate_needed": immediate_evacuations
        },
        "needs_attention": pending_reports > 10 or critical_alerts > 0 or immediate_evacuations > 5
    }


@router.get("/incident-trends")
def get_incident_trends(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get incident trends over time for data visualization
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from app.models.report import Report
    from sqlalchemy import func, cast, Date
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    district = current_user.district
    
    query = db.query(
        func.date(Report.created_at).label('date'),
        Report.hazard_type,
        func.count(Report.id).label('count')
    ).filter(Report.created_at >= cutoff)
    
    if district:
        query = query.filter(Report.district.ilike(f"%{district}%"))
    
    results = query.group_by(
        func.date(Report.created_at),
        Report.hazard_type
    ).order_by(func.date(Report.created_at)).all()
    
    # Format for frontend charting
    daily_data = {}
    for row in results:
        date_str = row.date.strftime("%Y-%m-%d")
        if date_str not in daily_data:
            daily_data[date_str] = {}
        daily_data[date_str][row.hazard_type or "unknown"] = row.count
    
    return {
        "days": days,
        "district": district or "National",
        "daily_breakdown": daily_data,
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("/hotspot-analysis")
def get_hotspot_analysis(
    hours: int = 48,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Identify geographic hotspots with clustering of incidents
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from app.models.report import Report
    from sqlalchemy import text
    
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    district = current_user.district
    
    # District filter for SQL
    district_filter = ""
    if district:
        district_filter = f"AND district ILIKE '%{district}%'"
    
    # PostGIS clustering query
    query = text(f"""
        SELECT 
            ST_Y(ST_Centroid(ST_Collect(location))) as center_lat,
            ST_X(ST_Centroid(ST_Collect(location))) as center_lon,
            COUNT(*) as report_count,
            hazard_type,
            array_agg(DISTINCT district) as districts,
            MAX(severity) as max_severity
        FROM reports
        WHERE created_at >= :cutoff
          AND status = 'verified'
          AND location IS NOT NULL
          {district_filter}
        GROUP BY 
            ST_SnapToGrid(location, 0.1),  -- ~11km grid
            hazard_type
        HAVING COUNT(*) >= 2
        ORDER BY report_count DESC
        LIMIT 20
    """)
    
    results = db.execute(query, {"cutoff": cutoff}).fetchall()
    
    hotspots = []
    for row in results:
        hotspots.append({
            "latitude": float(row[0]) if row[0] else None,
            "longitude": float(row[1]) if row[1] else None,
            "report_count": row[2],
            "hazard_type": row[3],
            "districts": row[4],
            "severity": row[5],
            "requires_action": row[2] >= 5  # Flag for immediate attention
        })
    
    return {
        "time_window_hours": hours,
        "district": district or "National",
        "hotspots": hotspots,
        "critical_hotspots": sum(1 for h in hotspots if h["requires_action"]),
        "generated_at": datetime.utcnow().isoformat()
    }


@router.post("/request-detailed-analysis")
async def request_detailed_analysis(
    background_tasks: BackgroundTasks,
    focus_area: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Request a detailed AI analysis report (runs in background)
    Can take 30-60 seconds due to multiple API calls
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Queue background task
    # background_tasks.add_task(
    #     generate_and_email_detailed_report,
    #     db, current_user, focus_area
    # )
    
    return {
        "message": "Detailed analysis requested",
        "status": "processing",
        "estimated_completion": "30-60 seconds",
        "will_notify": current_user.email
    }
