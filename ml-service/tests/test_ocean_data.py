import pytest
from src.external.ocean_data_client import OceanDataClient
import asyncio
import os
OPENWEATHER_API_KEY = os.environ["OPENWEATHER_API_KEY"]

@pytest.mark.asyncio
async def test_ocean_data():
    client = OceanDataClient(
        openweather_api_ktey=OPENWEATHER_API_KEY  
    )
    
    data = await client.get_comprehensive_data(
        latitude=19.0760,
        longitude=72.8777
    )
    
    print("\n Ocean Data for Mumbai:")
    print(f"Wave height: {data['ocean_conditions']['wave_height_m']:.1f}m")
    print(f"Wind speed: {data['ocean_conditions']['wind_speed_mps']:.1f}m/s")
    print(f"Weather: {data['ocean_conditions']['weather']}")
    print(f"Storm alert: {data['storm_alerts']['alert_active']}")
    print(f"Tsunami alert: {data['tsunami_alerts']['alert_active']}")
    
    assert "ocean_conditions" in data
    assert "storm_alerts" in data
    assert "tsunami_alerts" in data

if __name__ == "__main__":
    asyncio.run(test_ocean_data())