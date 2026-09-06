"""
AI-powered analysis using activity data for disaster response optimization
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user_activity import UserActivity
from app.models.report import Report
from app.models.red_zone import HazardZone, RelocationSite
from typing import Dict, List

class ActivityAIAnalyzer:
    
    @staticmethod
    def analyze_population_engagement(db: Session, district: str, hours: int = 3) -> Dict:
        """
        Analyze how engaged the population is during disaster
        Low engagement = people might not be aware of danger
        """
        time_threshold = datetime.utcnow() - timedelta(hours=hours)
        
        # Get active users
        active_users = db.query(
            func.count(func.distinct(UserActivity.user_id))
        ).filter(
            UserActivity.timestamp >= time_threshold,
            UserActivity.district == district
        ).scalar() or 0
        
        # Get safety checks specifically
        safety_checks = db.query(func.count(UserActivity.id)).filter(
            UserActivity.timestamp >= time_threshold,
            UserActivity.district == district,
            UserActivity.activity_type == 'safety_check'
        ).scalar() or 0
        
        # Get active red zones
        active_red_zones = db.query(func.count(HazardZone.id)).filter(
            HazardZone.district == district,
            HazardZone.is_active == True
        ).scalar() or 0
        
        # Calculate engagement ratio
        if active_users > 0:
            safety_check_ratio = safety_checks / active_users
        else:
            safety_check_ratio = 0
        
        # AI Analysis
        if active_red_zones > 0:
            # There's an active disaster
            if safety_check_ratio < 0.2:
                alert_level = "CRITICAL"
                recommendation = f"Only {int(safety_check_ratio * 100)}% of active users checked safety. Mass SMS/loudspeaker alerts recommended."
                action = "BROADCAST_EMERGENCY"
            elif safety_check_ratio < 0.5:
                alert_level = "MEDIUM"
                recommendation = "Moderate engagement. Send push notifications to inactive users."
                action = "SEND_NOTIFICATIONS"
            else:
                alert_level = "GOOD"
                recommendation = "Population is well-informed. Continue standard communication."
                action = "MAINTAIN"
        else:
            alert_level = "NORMAL"
            recommendation = "No active disasters. Activity levels normal."
            action = "MONITOR"
        
        return {
            "district": district,
            "active_users": active_users,
            "safety_checks": safety_checks,
            "engagement_ratio": round(safety_check_ratio, 2),
            "active_red_zones": active_red_zones,
            "alert_level": alert_level,
            "recommendation": recommendation,
            "suggested_action": action,
            "estimated_population": active_users * 500  # Ratio: 1 app user ≈ 500 residents
        }
    
    @staticmethod
    def detect_panic_spike(db: Session, district: str) -> Dict:
        """
        Detect abnormal spikes in activity that indicate panic
        """
        now = datetime.utcnow()
        
        # Compare current hour vs previous hour
        current_hour = db.query(func.count(UserActivity.id)).filter(
            UserActivity.timestamp >= now - timedelta(hours=1),
            UserActivity.district == district,
            UserActivity.activity_type == 'safety_check'
        ).scalar() or 0
        
        previous_hour = db.query(func.count(UserActivity.id)).filter(
            UserActivity.timestamp >= now - timedelta(hours=2),
            UserActivity.timestamp < now - timedelta(hours=1),
            UserActivity.district == district,
            UserActivity.activity_type == 'safety_check'
        ).scalar() or 1  # Avoid division by zero
        
        # Calculate spike ratio
        spike_ratio = current_hour / previous_hour if previous_hour > 0 else 0
        
        # AI Detection
        if spike_ratio > 10:
            panic_level = "EXTREME"
            message = f"PANIC DETECTED: {int(spike_ratio)}x spike in safety checks. Mass panic likely spreading."
            action = "ISSUE_CALMING_STATEMENT"
        elif spike_ratio > 5:
            panic_level = "HIGH"
            message = f"Elevated concern: {int(spike_ratio)}x increase in safety checks."
            action = "MONITOR_CLOSELY"
        elif spike_ratio > 2:
            panic_level = "MODERATE"
            message = "Increased citizen concern detected."
            action = "PREPARE_STATEMENT"
        else:
            panic_level = "NORMAL"
            message = "Activity levels within normal range."
            action = "CONTINUE_MONITORING"
        
        return {
            "district": district,
            "current_hour_checks": current_hour,
            "previous_hour_checks": previous_hour,
            "spike_ratio": round(spike_ratio, 1),
            "panic_level": panic_level,
            "message": message,
            "recommended_action": action
        }
    
    @staticmethod
    def optimize_resource_allocation(db: Session, districts: List[str]) -> List[Dict]:
        """
        AI-driven resource allocation based on activity vs incident ratio
        Higher incidents per user = more urgent need
        """
        time_threshold = datetime.utcnow() - timedelta(hours=3)
        results = []
        
        for district in districts:
            # Active users
            active_users = db.query(
                func.count(func.distinct(UserActivity.user_id))
            ).filter(
                UserActivity.timestamp >= time_threshold,
                UserActivity.district == district
            ).scalar() or 1
            
            # Recent reports
            incident_count = db.query(func.count(Report.id)).filter(
                Report.timestamp >= time_threshold,
                Report.district == district,
                Report.severity.in_(['high', 'critical'])
            ).scalar() or 0
            
            # Calculate urgency score
            urgency_score = incident_count / active_users if active_users > 0 else 0
            
            results.append({
                "district": district,
                "active_users": active_users,
                "critical_incidents": incident_count,
                "urgency_score": round(urgency_score, 3),
            })
        
        # Sort by urgency (highest first)
        results.sort(key=lambda x: x['urgency_score'], reverse=True)
        
        # Add priority ranking
        for i, result in enumerate(results, 1):
            result["priority_rank"] = i
            if i == 1:
                result["recommendation"] = "HIGHEST PRIORITY - Deploy rescue teams immediately"
            elif i <= 3:
                result["recommendation"] = "High priority - Prepare response teams"
            else:
                result["recommendation"] = "Monitor situation"
        
        return results
    
    @staticmethod
    def predict_evacuation_progress(db: Session, district: str) -> Dict:
        """
        Track evacuation progress by monitoring activity drop in red zones
        """
        time_threshold = datetime.utcnow() - timedelta(hours=6)
        
        # Get hourly activity for last 6 hours
        hourly_activity = db.query(
            func.date_trunc('hour', UserActivity.timestamp).label('hour'),
            func.count(func.distinct(UserActivity.user_id)).label('users')
        ).filter(
            UserActivity.timestamp >= time_threshold,
            UserActivity.district == district
        ).group_by('hour').order_by('hour').all()
        
        if len(hourly_activity) < 2:
            return {
                "district": district,
                "status": "INSUFFICIENT_DATA",
                "message": "Need more time to assess evacuation progress"
            }
        
        # Calculate trend
        first_hour_users = hourly_activity[0].users
        last_hour_users = hourly_activity[-1].users
        change_ratio = (last_hour_users - first_hour_users) / first_hour_users if first_hour_users > 0 else 0
        
        # AI Prediction
        if change_ratio < -0.5:
            status = "RAPID_EVACUATION"
            message = f"{abs(int(change_ratio * 100))}% decrease in activity. Evacuation in progress."
            prediction = "Most residents will evacuate within 2-4 hours"
        elif change_ratio < -0.2:
            status = "GRADUAL_EVACUATION"
            message = "Moderate evacuation activity detected."
            prediction = "Evacuation will complete in 6-12 hours"
        elif change_ratio > 0.2:
            status = "NO_EVACUATION"
            message = "Activity increasing. Population NOT evacuating."
            prediction = "Forced evacuation may be necessary"
        else:
            status = "STABLE"
            message = "Activity stable. Some voluntary evacuation."
            prediction = "Monitor for next 2 hours"
        
        return {
            "district": district,
            "status": status,
            "message": message,
            "prediction": prediction,
            "activity_change_percent": round(change_ratio * 100, 1),
            "hourly_data": [
                {"hour": h.hour.isoformat(), "users": h.users}
                for h in hourly_activity
            ]
        }
    
    @staticmethod
    def assess_shelter_capacity_needs(db: Session, district: str) -> Dict:
        """
        Estimate needed shelter capacity based on active users
        """
        time_threshold = datetime.utcnow() - timedelta(hours=3)
        
        # Active users (proxy for affected population)
        active_users = db.query(
            func.count(func.distinct(UserActivity.user_id))
        ).filter(
            UserActivity.timestamp >= time_threshold,
            UserActivity.district == district
        ).scalar() or 0
        
        # Estimated total population (1 app user ≈ 500 people)
        estimated_population = active_users * 500
        
        # Assumption: 20% will need shelter (vulnerable groups)
        estimated_shelter_need = int(estimated_population * 0.2)
        
        # Get current shelter capacity
        total_capacity = db.query(
            func.sum(RelocationSite.carrying_capacity)
        ).filter(
            RelocationSite.district == district,
            RelocationSite.status == 'operational'
        ).scalar() or 0
        
        available_capacity = db.query(
            func.sum(RelocationSite.available_capacity)
        ).filter(
            RelocationSite.district == district,
            RelocationSite.status == 'operational'
        ).scalar() or 0
        
        # AI Analysis
        capacity_gap = estimated_shelter_need - available_capacity
        
        if capacity_gap > 0:
            status = "INSUFFICIENT"
            recommendation = f"Need {capacity_gap} more shelter slots. Consider temporary camps."
        elif available_capacity > estimated_shelter_need * 1.5:
            status = "EXCESS"
            recommendation = "Sufficient capacity. Can accommodate overflow from nearby districts."
        else:
            status = "ADEQUATE"
            recommendation = "Capacity is sufficient for estimated need."
        
        return {
            "district": district,
            "active_users": active_users,
            "estimated_population": estimated_population,
            "estimated_shelter_need": estimated_shelter_need,
            "current_capacity": total_capacity,
            "available_capacity": available_capacity,
            "capacity_gap": capacity_gap,
            "status": status,
            "recommendation": recommendation
        }
