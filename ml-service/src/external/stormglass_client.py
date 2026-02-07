
import httpx
from typing import Dict
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

class StormglassClient:
    """
    Stormglass Marine Data API
    Provides accurate wave, tide, and weather data
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("STORMGLASS_API_KEY")
        self.base_url = "https://api.stormglass.io/v2"
        self.timeout = 10.0
    
    async def get_wave_data(self, latitude: float, longitude: float) -> Dict:
        """
        Get marine/wave data for location
        
        Returns:
            {
                "wave_height_m": 2.5,
                "wave_period_s": 8.0,
                "wave_direction": 180,
                "swell_height_m": 1.8
            }
        """
        if not self.api_key:
            logger.warning(" Using mock data (no Stormglass API key)")
            return self._get_mock_data()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/weather/point",
                    params={
                        "lat": latitude,
                        "lng": longitude,
                        "params": "waveHeight,wavePeriod,waveDirection,swellHeight"
                    },
                    headers={"Authorization": self.api_key}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    hours = data.get("hours", [])
                    
                    if hours:
                        current = hours[0]
                        
                        return {
                            "wave_height_m": current.get("waveHeight", {}).get("noaa", 0),
                            "wave_period_s": current.get("wavePeriod", {}).get("noaa", 0),
                            "wave_direction": current.get("waveDirection", {}).get("noaa", 0),
                            "swell_height_m": current.get("swellHeight", {}).get("noaa", 0),
                            "timestamp": current.get("time"),
                            "source": "Stormglass"
                        }
        except Exception as e:
            logger.error(f"❌ Stormglass error: {str(e)}")
        
        return self._get_mock_data()
    
    def _get_mock_data(self) -> Dict:
        return {
            "wave_height_m": 1.5,
            "wave_period_s": 7.0,
            "wave_direction": 180,
            "swell_height_m": 1.2,
            "timestamp": datetime.now().isoformat(),
            "source": "mock_data"
        }