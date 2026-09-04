"""
Real-time Data Aggregation Service
Fetches and consolidates data from multiple sources for admin analysis
"""
import logging
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.report import Report
from app.models.social import SocialPost
from app.models.alert import Alert
from app.models.red_zone import HazardZone, VulnerableHabitation
from app.services.bedrock_ai import generate_ai_analysis

logger = logging.getLogger(__name__)


class DataAggregator:
    """Aggregates data from multiple sources for comprehensive admin reports"""
    
    def __init__(self, db: Session, district: Optional[str] = None):
        self.db = db
        self.district = district
        
    async def fetch_weather_data(self) -> Dict:
        """
        Fetch weather data from IMD (India Meteorological Department)
        Note: This requires IMD API access - using mock data for now
        """
        try:
            # TODO: Replace with actual IMD API when credentials available
            # url = "https://api.imd.gov.in/..."
            
            # Mock severe weather data
            return {
                "source": "IMD",
                "severe_weather_warnings": [],
                "cyclone_alerts": [],
                "rainfall_warnings": [],
                "last_updated": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Weather data fetch error: {e}")
            return {"source": "IMD", "error": str(e)}
    
    async def fetch_seismic_data(self) -> Dict:
        """
        Fetch earthquake data from USGS or IMD
        """
        try:
            # Using USGS public API for significant earthquakes in India region
            timeout = aiohttp.ClientTimeout(total=15)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
                params = {
                    "format": "geojson",
                    "minlatitude": 6.0,
                    "maxlatitude": 36.0,
                    "minlongitude": 68.0,
                    "maxlongitude": 98.0,
                    "minmagnitude": 4.0,
                    "starttime": (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d"),
                    "endtime": datetime.utcnow().strftime("%Y-%m-%d"),
                    "limit": 50  # Limit results to prevent large responses
                }
                
                try:
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            earthquakes = []
                            
                            for feature in data.get("features", [])[:10]:
                                props = feature.get("properties", {})
                                coords = feature.get("geometry", {}).get("coordinates", [])
                                
                                # Validate coordinates
                                if len(coords) >= 2:
                                    earthquakes.append({
                                        "magnitude": props.get("mag"),
                                        "location": props.get("place"),
                                        "time": datetime.fromtimestamp(props.get("time", 0) / 1000).isoformat() if props.get("time") else None,
                                        "latitude": coords[1],
                                        "longitude": coords[0],
                                        "depth_km": coords[2] if len(coords) > 2 else None,
                                        "url": props.get("url")
                                    })
                            
                            return {
                                "source": "USGS",
                                "earthquakes": earthquakes,
                                "count": len(earthquakes),
                                "last_updated": datetime.utcnow().isoformat(),
                                "status": "success"
                            }
                        else:
                            logger.warning(f"USGS API returned HTTP {response.status}")
                            return {
                                "source": "USGS", 
                                "error": f"HTTP {response.status}",
                                "earthquakes": [],
                                "count": 0,
                                "status": "error"
                            }
                            
                except asyncio.TimeoutError:
                    logger.error("USGS API timeout")
                    return {
                        "source": "USGS",
                        "error": "API timeout",
                        "earthquakes": [],
                        "count": 0,
                        "status": "timeout"
                    }
                except aiohttp.ClientError as e:
                    logger.error(f"USGS API client error: {e}")
                    return {
                        "source": "USGS",
                        "error": f"Network error: {str(e)}",
                        "earthquakes": [],
                        "count": 0,
                        "status": "network_error"
                    }
                    
        except Exception as e:
            logger.error(f"Seismic data fetch error: {e}", exc_info=True)
            return {
                "source": "USGS",
                "error": str(e),
                "earthquakes": [],
                "count": 0,
                "status": "system_error"
            }
    
    def get_citizen_reports_summary(self, hours: int = 24) -> Dict:
        """Summarize citizen reports from last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = self.db.query(Report).filter(Report.created_at >= cutoff_time)
        if self.district:
            query = query.filter(Report.district.ilike(f"%{self.district}%"))
        
        reports = query.all()
        
        # Group by hazard type
        by_type = {}
        by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        by_status = {"pending": 0, "verified": 0, "false": 0}
        verified_reports = []
        
        for report in reports:
            # By type
            hazard = report.hazard_type or "unknown"
            by_type[hazard] = by_type.get(hazard, 0) + 1
            
            # By severity
            severity = report.severity or "medium"
            by_severity[severity] = by_severity.get(severity, 0) + 1
            
            # By status
            status = report.status or "pending"
            by_status[status] = by_status.get(status, 0) + 1
            
            # Collect verified reports for hotspot analysis
            if report.status == "verified":
                verified_reports.append({
                    "id": report.id,
                    "type": report.hazard_type,
                    "severity": report.severity,
                    "latitude": report.latitude,
                    "longitude": report.longitude,
                    "district": report.district,
                    "description": report.description,
                    "ai_score": report.ai_authenticity_score
                })
        
        return {
            "time_window_hours": hours,
            "total_reports": len(reports),
            "by_hazard_type": by_type,
            "by_severity": by_severity,
            "by_status": by_status,
            "verified_reports": verified_reports,
            "pending_verification": by_status["pending"]
        }
    
    def get_social_media_analysis(self, hours: int = 24) -> Dict:
        """Analyze social media posts for disaster signals"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = self.db.query(SocialPost).filter(SocialPost.published_at >= cutoff_time)
        # Note: SocialPost model doesn't have location field, so no district filtering for now
        
        posts = query.all()
        
        sentiment_analysis = {"positive": 0, "neutral": 0, "negative": 0, "urgent": 0}
        trending_keywords = {}
        
        for post in posts:
            # Analyze sentiment (simplified)
            text = post.content.lower() if post.content else ""
            
            if any(word in text for word in ["urgent", "emergency", "help", "critical", "disaster"]):
                sentiment_analysis["urgent"] += 1
            elif any(word in text for word in ["danger", "warning", "alert", "evacuate"]):
                sentiment_analysis["negative"] += 1
            elif any(word in text for word in ["safe", "rescue", "recovered", "relief"]):
                sentiment_analysis["positive"] += 1
            else:
                sentiment_analysis["neutral"] += 1
            
            # Extract keywords (basic approach)
            keywords = ["flood", "cyclone", "tsunami", "earthquake", "landslide", "fire"]
            for keyword in keywords:
                if keyword in text:
                    trending_keywords[keyword] = trending_keywords.get(keyword, 0) + 1
        
        return {
            "time_window_hours": hours,
            "total_posts": len(posts),
            "sentiment_distribution": sentiment_analysis,
            "trending_keywords": trending_keywords,
            "urgent_count": sentiment_analysis["urgent"]
        }
    
    def get_red_zone_status(self) -> Dict:
        """Get current red zone and relocation status"""
        zones_query = self.db.query(HazardZone).filter(HazardZone.is_active == True)
        if self.district:
            zones_query = zones_query.filter(HazardZone.district.ilike(f"%{self.district}%"))
        
        zones = zones_query.all()
        
        hab_query = self.db.query(VulnerableHabitation)
        if self.district:
            hab_query = hab_query.filter(VulnerableHabitation.district.ilike(f"%{self.district}%"))
        
        habitations = hab_query.all()
        
        # Priority breakdown
        priority_counts = {
            "IMMEDIATE": sum(1 for h in habitations if h.priority == "IMMEDIATE"),
            "SHORT_TERM": sum(1 for h in habitations if h.priority == "SHORT_TERM"),
            "MEDIUM_TERM": sum(1 for h in habitations if h.priority == "MEDIUM_TERM"),
            "SAFE": sum(1 for h in habitations if h.priority == "SAFE")
        }
        
        # Population at risk
        total_population = sum(h.population for h in habitations if h.population)
        immediate_population = sum(
            h.population for h in habitations 
            if h.priority == "IMMEDIATE" and h.population
        )
        
        return {
            "active_red_zones": len(zones),
            "vulnerable_habitations": len(habitations),
            "priority_distribution": priority_counts,
            "total_population_at_risk": total_population,
            "immediate_evacuation_needed": priority_counts["IMMEDIATE"],
            "immediate_population": immediate_population
        }
    
    def get_active_alerts(self) -> Dict:
        """Get currently active alerts"""
        alerts = self.db.query(Alert).filter(
            Alert.is_active == True,
            Alert.expires_at > datetime.utcnow()
        ).all()
        
        if self.district:
            alerts = [a for a in alerts if self.district.lower() in (a.district or "").lower()]
        
        by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for alert in alerts:
            severity = alert.severity or "medium"
            by_severity[severity] = by_severity.get(severity, 0) + 1
        
        return {
            "total_active": len(alerts),
            "by_severity": by_severity,
            "alerts": [
                {
                    "id": a.id,
                    "title": a.title,
                    "severity": a.severity,
                    "district": a.district,
                    "expires_at": a.expires_at.isoformat() if a.expires_at else None
                }
                for a in alerts[:10]
            ]
        }
    
    async def generate_consolidated_report(self) -> Dict:
        """
        Generate comprehensive consolidated report for admins
        Combines all data sources with AI analysis
        """
        # Gather all data
        citizen_reports = self.get_citizen_reports_summary(hours=24)
        social_media = self.get_social_media_analysis(hours=24)
        red_zone_status = self.get_red_zone_status()
        active_alerts = self.get_active_alerts()
        
        # Fetch external data asynchronously
        weather_task = asyncio.create_task(self.fetch_weather_data())
        seismic_task = asyncio.create_task(self.fetch_seismic_data())
        
        weather_data = await weather_task
        seismic_data = await seismic_task
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(
            citizen_reports, social_media, red_zone_status, 
            weather_data, seismic_data, active_alerts
        )
        
        # Prepare data for AI analysis
        consolidated_data = {
            "district": self.district or "National",
            "generated_at": datetime.utcnow().isoformat(),
            "risk_assessment": {
                "overall_risk_score": risk_score,
                "risk_level": self._get_risk_level(risk_score)
            },
            "citizen_reports": citizen_reports,
            "social_media_analysis": social_media,
            "red_zone_status": red_zone_status,
            "active_alerts": active_alerts,
            "external_data": {
                "weather": weather_data,
                "seismic": seismic_data
            }
        }
        
        # Generate AI-powered executive summary
        try:
            ai_summary = await self._generate_ai_executive_summary(consolidated_data)
            consolidated_data["ai_executive_summary"] = ai_summary
        except Exception as e:
            logger.error(f"AI summary generation error: {e}")
            # Provide a fallback summary when AI fails
            consolidated_data["ai_executive_summary"] = {
                "error": str(e),
                "analysis": self._generate_fallback_summary(consolidated_data),
                "model": "Fallback Analysis",
                "generated_at": datetime.utcnow().isoformat()
            }
        
        return consolidated_data
    
    def _calculate_risk_score(
        self, 
        citizen_reports: Dict,
        social_media: Dict,
        red_zone_status: Dict,
        weather_data: Dict,
        seismic_data: Dict,
        active_alerts: Dict
    ) -> float:
        """Calculate composite risk score (0-100)"""
        score = 0.0
        
        # Citizen reports weight: 30%
        verified_count = citizen_reports["by_status"]["verified"]
        pending_count = citizen_reports["by_status"]["pending"]
        critical_count = citizen_reports["by_severity"]["critical"]
        
        if verified_count > 0:
            score += min(30, verified_count * 2 + critical_count * 5)
        
        # Social media urgency weight: 15%
        urgent_posts = social_media["urgent_count"]
        if urgent_posts > 0:
            score += min(15, urgent_posts * 1.5)
        
        # Red zone status weight: 25%
        immediate_evac = red_zone_status["immediate_evacuation_needed"]
        if immediate_evac > 0:
            score += min(25, immediate_evac * 8)
        
        # Active alerts weight: 20%
        critical_alerts = active_alerts["by_severity"]["critical"]
        high_alerts = active_alerts["by_severity"]["high"]
        if critical_alerts > 0 or high_alerts > 0:
            score += min(20, critical_alerts * 10 + high_alerts * 5)
        
        # Seismic activity weight: 10%
        earthquakes = seismic_data.get("earthquakes", [])
        major_quakes = [e for e in earthquakes if e.get("magnitude", 0) >= 5.0]
        if major_quakes:
            score += min(10, len(major_quakes) * 5)
        
        return min(100.0, score)
    
    def _get_risk_level(self, score: float) -> str:
        """Convert risk score to categorical level"""
        if score >= 75:
            return "CRITICAL"
        elif score >= 50:
            return "HIGH"
        elif score >= 25:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _generate_fallback_summary(self, data: Dict) -> str:
        """Generate a rule-based summary when AI is unavailable"""
        risk_score = data['risk_assessment']['overall_risk_score']
        risk_level = data['risk_assessment']['risk_level']
        district = data['district']
        
        # Key metrics
        total_reports = data['citizen_reports']['total_reports']
        verified_reports = data['citizen_reports']['by_status']['verified']
        critical_reports = data['citizen_reports']['by_severity']['critical']
        urgent_social = data['social_media_analysis']['urgent_count']
        immediate_evac = data['red_zone_status']['immediate_evacuation_needed']
        active_alerts = data['active_alerts']['total_active']
        earthquakes = data['external_data']['seismic']['count']
        
        # Generate summary based on risk level
        if risk_level == "CRITICAL":
            executive = f"CRITICAL SITUATION: {district} is experiencing severe risk conditions requiring immediate action."
            concerns = [
                f"{critical_reports} critical severity reports require urgent attention",
                f"{immediate_evac} settlements need immediate evacuation",
                f"{urgent_social} social media posts indicate public distress"
            ]
            actions = [
                "Activate emergency command center immediately",
                "Deploy rescue teams to critical report locations",
                "Issue public evacuation orders for red zones",
                "Coordinate with neighboring districts for resources"
            ]
        elif risk_level == "HIGH":
            executive = f"HIGH ALERT: {district} shows elevated disaster risk requiring enhanced monitoring and preparation."
            concerns = [
                f"{verified_reports} verified reports in last 24 hours",
                f"{immediate_evac} areas flagged for potential evacuation",
                f"Social media showing {urgent_social} urgent distress signals"
            ]
            actions = [
                "Position emergency resources strategically",
                "Verify and investigate pending reports",
                "Prepare evacuation routes and shelters",
                "Issue public safety advisories"
            ]
        elif risk_level == "MEDIUM":
            executive = f"MODERATE RISK: {district} requires standard vigilance with some areas of concern."
            concerns = [
                f"{total_reports} reports received, {verified_reports} verified",
                f"{active_alerts} active alerts in the region"
            ]
            actions = [
                "Continue routine monitoring",
                "Process pending report verifications",
                "Review red zone assessments"
            ]
        else:  # LOW
            executive = f"LOW RISK: {district} showing minimal disaster activity with routine monitoring sufficient."
            concerns = ["No significant immediate threats identified"]
            actions = ["Maintain standard monitoring protocols"]
        
        # Add earthquake info if relevant
        if earthquakes > 0:
            concerns.append(f"{earthquakes} earthquakes detected in region (M4.0+)")
            if earthquakes >= 3:
                actions.append("Monitor for potential aftershocks and structural damage")
        
        summary = f"""**EXECUTIVE SUMMARY**
{executive}

**KEY CONCERNS:**
{chr(10).join(f'• {concern}' for concern in concerns[:5])}

**IMMEDIATE ACTIONS REQUIRED:**
{chr(10).join(f'• {action}' for action in actions[:5])}

**24-HOUR OUTLOOK:**
Based on current trends, maintain {risk_level.lower()} alert status. Continue monitoring citizen reports and social media signals. {"Weather and seismic conditions should be monitored closely." if risk_score > 25 else "No significant deterioration expected."}

*This analysis was generated using rule-based algorithms due to AI service unavailability.*"""

        return summary

    async def _generate_ai_executive_summary(self, data: Dict) -> Dict:
        """Generate AI-powered executive summary using AWS Bedrock"""
        from app.services.bedrock_ai import generate_ai_analysis
        
        # Prepare prompt for AI
        prompt = f"""You are a disaster management analyst providing an executive summary for government administrators.

Analyze the following consolidated disaster management data and provide:
1. Executive Summary (2-3 sentences)
2. Key Concerns (bullet points, max 5)
3. Immediate Actions Required (bullet points, max 5)
4. 24-hour Outlook

Data:
- Risk Level: {data['risk_assessment']['risk_level']} (Score: {data['risk_assessment']['overall_risk_score']}/100)
- District: {data['district']}
- Citizen Reports (24h): {data['citizen_reports']['total_reports']} total, {data['citizen_reports']['by_status']['verified']} verified
- Critical Reports: {data['citizen_reports']['by_severity']['critical']}
- Social Media Urgency: {data['social_media_analysis']['urgent_count']} urgent posts
- Active Red Zones: {data['red_zone_status']['active_red_zones']}
- Immediate Evacuations Needed: {data['red_zone_status']['immediate_evacuation_needed']} settlements ({data['red_zone_status']['immediate_population']} people)
- Active Alerts: {data['active_alerts']['total_active']} ({data['active_alerts']['by_severity']['critical']} critical)
- Recent Earthquakes: {data['external_data']['seismic'].get('count', 0)}

Provide a concise, actionable analysis for administrators."""

        try:
            analysis = await generate_ai_analysis(prompt, max_tokens=800)
            
            return {
                "generated_at": datetime.utcnow().isoformat(),
                "analysis": analysis,
                "model": "AWS Bedrock Claude 3.5 Sonnet"
            }
        except Exception as e:
            logger.error(f"AI analysis error: {e}")
            raise


# Async function for use in FastAPI
async def generate_consolidated_report(db: Session, district: Optional[str] = None) -> Dict:
    """Generate consolidated report for use in async FastAPI endpoints"""
    aggregator = DataAggregator(db, district)
    return await aggregator.generate_consolidated_report()
