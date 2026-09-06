from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Optional
from app.api import deps
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.report import Report

router = APIRouter()

@router.post("/track")
def track_activity(
    activity_type: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Track user activity (login, report_submit, safety_check, app_open)
    No location data stored - only activity type and user's registered district
    """
    activity = UserActivity(
        user_id=current_user.id,
        activity_type=activity_type,
        district=current_user.district,
        state=current_user.state
    )
    db.add(activity)
    db.commit()
    return {"status": "tracked"}


@router.get("/stats")
def get_activity_stats(
    hours: int = 3,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Get aggregated activity statistics for admin's jurisdiction
    Privacy-safe: No individual user data, just counts
    """
    time_threshold = datetime.utcnow() - timedelta(hours=hours)
    
    # Filter by admin's district
    district_filter = current_user.district if current_user.district != "National" else None
    
    # Base query
    base_query = db.query(UserActivity).filter(UserActivity.timestamp >= time_threshold)
    if district_filter:
        base_query = base_query.filter(UserActivity.district == district_filter)
    
    # Count active users (unique user_ids)
    active_users = base_query.with_entities(
        func.count(func.distinct(UserActivity.user_id))
    ).scalar()
    
    # Count by activity type
    activity_counts = base_query.with_entities(
        UserActivity.activity_type,
        func.count(UserActivity.id)
    ).group_by(UserActivity.activity_type).all()
    
    # Get recent reports count (last 3 hours)
    reports_query = db.query(Report).filter(Report.created_at >= time_threshold)
    if district_filter:
        reports_query = reports_query.filter(Report.district == district_filter)
    reports_count = reports_query.count()
    
    # Get verified reports count
    verified_reports = reports_query.filter(Report.is_verified == True).count()
    
    # Activity breakdown
    activity_breakdown = {item[0]: item[1] for item in activity_counts}
    
    return {
        "district": current_user.district,
        "time_window_hours": hours,
        "active_users": active_users or 0,
        "total_activities": base_query.count(),
        "activity_breakdown": {
            "logins": activity_breakdown.get("login", 0),
            "reports_submitted": activity_breakdown.get("report_submit", 0),
            "safety_checks": activity_breakdown.get("safety_check", 0),
            "app_opens": activity_breakdown.get("app_open", 0),
        },
        "reports": {
            "total": reports_count,
            "verified": verified_reports,
            "pending": reports_count - verified_reports
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/hourly-trend")
def get_hourly_trend(
    hours: int = 24,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Get hourly activity trend for the last N hours
    """
    time_threshold = datetime.utcnow() - timedelta(hours=hours)
    district_filter = current_user.district if current_user.district != "National" else None
    
    base_query = db.query(
        func.date_trunc('hour', UserActivity.timestamp).label('hour'),
        func.count(func.distinct(UserActivity.user_id)).label('active_users'),
        func.count(UserActivity.id).label('total_activities')
    ).filter(UserActivity.timestamp >= time_threshold)
    
    if district_filter:
        base_query = base_query.filter(UserActivity.district == district_filter)
    
    hourly_data = base_query.group_by('hour').order_by('hour').all()
    
    return {
        "district": current_user.district,
        "hours": hours,
        "data": [
            {
                "hour": item.hour.isoformat(),
                "active_users": item.active_users,
                "total_activities": item.total_activities
            }
            for item in hourly_data
        ]
    }


@router.get("/ai-insights")
def get_ai_insights(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    """
    AI-powered insights using activity data
    - Population engagement analysis
    - Panic detection
    - Resource allocation optimization
    - Evacuation progress prediction
    - Shelter capacity assessment
    """
    from app.services.activity_ai_analyzer import ActivityAIAnalyzer
    
    district = current_user.district
    
    # Run all AI analyses
    insights = {
        "district": district,
        "timestamp": datetime.utcnow().isoformat(),
        "engagement_analysis": ActivityAIAnalyzer.analyze_population_engagement(db, district),
        "panic_detection": ActivityAIAnalyzer.detect_panic_spike(db, district),
        "evacuation_progress": ActivityAIAnalyzer.predict_evacuation_progress(db, district),
        "shelter_capacity": ActivityAIAnalyzer.assess_shelter_capacity_needs(db, district)
    }
    
    return insights
