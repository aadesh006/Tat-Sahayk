"""
Reverse geocoding service using OpenStreetMap Nominatim API
Free, no API key required
"""
import httpx
from typing import Optional


def get_district_from_coords(lat: float, lon: float) -> Optional[str]:
    """
    Reverse geocode coordinates to get district/city name.
    Uses OpenStreetMap Nominatim - free, no API key needed.
    
    Args:
        lat: Latitude in decimal degrees
        lon: Longitude in decimal degrees
        
    Returns:
        District/city name or None if geocoding fails
    """
    try:
        response = httpx.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": lat,
                "lon": lon,
                "format": "json",
                "addressdetails": 1
            },
            headers={"User-Agent": "TatSahayk/1.0"},
            timeout=5.0
        )
        
        if response.status_code != 200:
            print(f"Nominatim returned status {response.status_code}")
            return None
            
        data = response.json()
        address = data.get("address", {})
        
        # Nominatim returns district in different fields depending on region
        # Try multiple fields in order of preference
        district = (
            address.get("city") or
            address.get("county") or
            address.get("state_district") or
            address.get("suburb") or
            address.get("town") or
            address.get("village") or
            None
        )
        
        if district:
            print(f"Geocoded ({lat}, {lon}) → {district}")
        else:
            print(f"No district found for ({lat}, {lon})")
            
        return district
        
    except httpx.TimeoutException:
        print(f"Geocoding timeout for ({lat}, {lon})")
        return None
    except Exception as e:
        print(f"Geocoding failed for ({lat}, {lon}): {e}")
        return None
