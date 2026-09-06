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
        
        # For administrative jurisdiction, we need broader classification
        # Priority order for admin purposes:
        # 1. City (major urban centers) - Mumbai, Chennai, Jaipur city proper
        # 2. County/Tehsil (administrative subdivision) - Sanganer Tehsil, Bagru area
        # 3. State District (broader district) - Jaipur district, Mumbai district
        # Skip village/hamlet as they're too granular for admin jurisdiction
        
        district = (
            address.get("city") or              # Major cities: Mumbai, Jaipur city
            address.get("county") or            # Tehsil level: Sanganer Tehsil
            address.get("state_district") or    # District level: Jaipur, Mumbai
            None
        )
        
        # Clean up tehsil suffix if present (e.g., "Sanganer Tehsil" → "Sanganer")
        if district and "Tehsil" in district:
            district = district.replace(" Tehsil", "").strip()
        
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
