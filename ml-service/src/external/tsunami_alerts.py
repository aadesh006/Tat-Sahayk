import httpx
import xml.etree.ElementTree as ET
from typing import Dict, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TsunamiAlertClient:
    
    def __init__(self):
        self.rss_url = "https://www.tsunami.gov/events/xml/PHEBatomFeed.xml"
        self.timeout = 10.0
    
    async def get_active_alerts(self) -> Dict:
        """
        Get active tsunami alerts
        
        Returns:
            {
                "alert_active": True/False,
                "alerts": [...],
                "total_count": 0
            }
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.rss_url)
                
                if response.status_code == 200:
                    # Parse XML
                    root = ET.fromstring(response.content)
                    
                    alerts = []
                    for entry in root.findall(".//{http://www.w3.org/2005/Atom}entry"):
                        title = entry.find("{http://www.w3.org/2005/Atom}title")
                        updated = entry.find("{http://www.w3.org/2005/Atom}updated")
                        
                        if title is not None:
                            alerts.append({
                                "title": title.text,
                                "updated": updated.text if updated is not None else None
                            })
                    
                    logger.info(f"✅ Found {len(alerts)} tsunami alerts")
                    
                    return {
                        "alert_active": len(alerts) > 0,
                        "alerts": alerts,
                        "total_count": len(alerts),
                        "source": "PTWC"
                    }
        except Exception as e:
            logger.error(f"❌ Tsunami alert error: {str(e)}")
        
        return {
            "alert_active": False,
            "alerts": [],
            "total_count": 0
        }
    
    async def check_location_threat(
        self, 
        latitude: float, 
        longitude: float,
        radius_km: float = 1000
    ) -> Dict:
        alerts = await self.get_active_alerts()

        return {
            "threatened": alerts["alert_active"],
            "alert_count": alerts["total_count"],
            "alerts": alerts["alerts"]
        }