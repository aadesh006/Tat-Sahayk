from typing import Dict, Optional
import logging
from .openweather_client import OpenWeatherClient
from .tsunami_alerts import TsunamiAlertClient

logger = logging.getLogger(__name__)

class OceanDataClient:
    
    def __init__(
        self,
        openweather_api_key: Optional[str] = None
    ):
        self.weather_client = OpenWeatherClient(api_key=openweather_api_key)
        self.tsunami_client = TsunamiAlertClient()
    
    async def get_comprehensive_data(
        self,
        latitude: float,
        longitude: float
    ) -> Dict:

        logger.info(f" Fetching ocean data for ({latitude}, {longitude})")
        
        # Get data from all sources
        weather_data = await self.weather_client.get_ocean_conditions(latitude, longitude)
        storm_alerts = await self.weather_client.get_storm_alerts(latitude, longitude)
        tsunami_alerts = await self.tsunami_client.get_active_alerts()
        
        return {
            "ocean_conditions": weather_data,
            "storm_alerts": storm_alerts,
            "tsunami_alerts": tsunami_alerts,
            "location": {
                "latitude": latitude,
                "longitude": longitude
            }
        }
    
    async def verify_hazard_report(
        self,
        hazard_type: str,
        latitude: float,
        longitude: float
    ) -> Dict:
        data = await self.get_comprehensive_data(latitude, longitude)
        
        verified = False
        confidence = 0.0
        explanation = ""
        
        # Verify based on hazard type
        if hazard_type == "tsunami":
            tsunami = data["tsunami_alerts"]
            verified = tsunami["alert_active"]
            confidence = 1.0 if verified else 0.1
            explanation = (
                f"Tsunami alert {'ACTIVE' if verified else 'not active'}. "
                f"{tsunami['total_count']} active alerts."
            )
            
        elif hazard_type == "high_waves":
            wave_height = data["ocean_conditions"].get("wave_height_m", 0)
            verified = wave_height > 3.0  # High waves threshold
            confidence = min(wave_height / 5.0, 1.0)
            explanation = (
                f"Current wave height: {wave_height:.1f}m. "
                f"{'Confirms' if verified else 'Does not confirm'} high waves report."
            )
            
        elif hazard_type in ["storm_surge", "cyclone"]:
            storm = data["storm_alerts"]
            verified = storm["alert_active"] and storm["severity"] in ["high", "medium"]
            confidence = 0.8 if storm["severity"] == "high" else 0.5
            explanation = (
                f"Storm alert: {storm['alert_type']} ({storm['severity']} severity). "
                f"Wind speed: {storm['wind_speed_mps']:.1f}m/s."
            )
            
        else:
            explanation = f"No real-time data available for {hazard_type}"
        
        logger.info(
            f"{'✅' if verified else '❌'} Verification: {hazard_type} "
            f"(confidence: {confidence:.2%})"
        )
        
        return {
            "verified": verified,
            "confidence": confidence,
            "real_data": data,
            "explanation": explanation,
            "hazard_type": hazard_type
        }