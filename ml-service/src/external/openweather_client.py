import httpx
from typing import Dict
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

class OpenWeatherClient:
    """
    Client for OpenWeatherMap API
    
    Provides:
    - Wave height data
    - Weather conditions
    - Storm/cyclone alerts
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENWEATHER_API_KEY")
        if not self.api_key:
            logger.warning(" No OpenWeatherMap API key found!")
        
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.timeout = 10.0
    
    async def get_ocean_conditions(self, latitude: float, longitude: float) -> Dict:
        """
        Get ocean/weather conditions for location
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            
        Returns:
            {
                "wave_height_m": 2.5,
                "wind_speed_mps": 15.0,
                "weather": "storm",
                "alerts": [...],
                "timestamp": "..."
            }
        """
        if not self.api_key:
            logger.warning(" Using mock data (no API key)")
            return self._get_mock_data(latitude, longitude)
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Get current weather
                response = await client.get(
                    f"{self.base_url}/weather",
                    params={
                        "lat": latitude,
                        "lon": longitude,
                        "appid": self.api_key,
                        "units": "metric"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    wind_speed = data.get("wind", {}).get("speed", 0)
                    weather_main = data.get("weather", [{}])[0].get("main", "Clear")
                    wave_height = wind_speed / 6.0
                    
                    logger.info(
                        f" OpenWeather data: wind={wind_speed}m/s, "
                        f"wave~{wave_height:.1f}m, weather={weather_main}"
                    )
                    
                    return {
                        "wave_height_m": wave_height,
                        "wind_speed_mps": wind_speed,
                        "weather": weather_main.lower(),
                        "temperature_c": data.get("main", {}).get("temp"),
                        "pressure_hpa": data.get("main", {}).get("pressure"),
                        "timestamp": datetime.now().isoformat(),
                        "source": "OpenWeatherMap",
                        "location": data.get("name", "Unknown")
                    }
                else:
                    logger.error(f" OpenWeather API error: {response.status_code}")
                    
        except Exception as e:
            logger.error(f" OpenWeather error: {str(e)}")
        
        return self._get_mock_data(latitude, longitude)
    
    async def get_storm_alerts(self, latitude: float, longitude: float) -> Dict:
        """
        Check for storm/cyclone alerts
        
        Returns:
            {
                "alert_active": True/False,
                "alert_type": "storm" / "cyclone" / None,
                "severity": "high" / "medium" / "low"
            }
        """
        conditions = await self.get_ocean_conditions(latitude, longitude)
        
        wind_speed = conditions.get("wind_speed_mps", 0)
        weather = conditions.get("weather", "clear")
        
        # Determine alert level
        alert_active = False
        alert_type = None
        severity = "low"
        
        # Cyclone: Very high wind speeds
        if wind_speed > 25:
            alert_active = True
            alert_type = "cyclone"
            severity = "high"
        # Storm: High wind speeds
        elif wind_speed > 15 or "storm" in weather or "thunder" in weather:
            alert_active = True
            alert_type = "storm"
            severity = "medium"
        # High waves
        elif wind_speed > 10:
            alert_active = True
            alert_type = "high_waves"
            severity = "low"
        
        return {
            "alert_active": alert_active,
            "alert_type": alert_type,
            "severity": severity,
            "wind_speed_mps": wind_speed,
            "conditions": weather
        }
    
    def _get_mock_data(self, lat: float, lon: float) -> Dict:
        """Mock data for testing"""
        return {
            "wave_height_m": 1.8,
            "wind_speed_mps": 8.5,
            "weather": "clear",
            "temperature_c": 28.0,
            "pressure_hpa": 1013,
            "timestamp": datetime.now().isoformat(),
            "source": "mock_data"
        }