import httpx
import datetime
import logging
from typing import Dict
from app.core.config import settings

logger = logging.getLogger(__name__)

OPENWEATHER_API_KEY = settings.OPENWEATHER_API_KEY
TAVILY_API_KEY = settings.TAVILY_API_KEY

# Map disaster types to expected weather conditions
DISASTER_WEATHER_MAP = {
    "Flood":         ["Rain", "Thunderstorm", "Drizzle"],
    "Cyclone":       ["Thunderstorm", "Squall", "Tornado"],
    "Storm":         ["Thunderstorm", "Squall", "Rain"],
    "Heatwave":      ["Clear", "Clouds"],
    "Wildfire":      ["Clear"],
    "Landslide":     ["Rain", "Thunderstorm"],
    "Earthquake":    None,   # weather-independent
    "Oil Spill":     None,   # weather-independent
    "Industrial":    None,   # weather-independent
    "Tsunami":       None,   # weather-independent (underwater earthquake)
}

# India disaster seasons
# Flood season: June–October (monsoon)
# Cyclone season: April–June, October–December
# Heatwave: March–June
# Wildfire: February–June (dry season)
# Landslide: June–September (monsoon)
DISASTER_SEASON_MAP = {
    "Flood":     list(range(6, 11)),         # Jun-Oct
    "Cyclone":   [4, 5, 6, 10, 11, 12],     # Apr-Jun, Oct-Dec
    "Heatwave":  [3, 4, 5, 6],              # Mar-Jun
    "Wildfire":  [2, 3, 4, 5, 6],           # Feb-Jun
    "Landslide": list(range(6, 10)),         # Jun-Sep
    "Storm":     list(range(6, 11)),         # Jun-Oct (monsoon)
}


def check_weather_context(lat: float, lon: float, hazard_type: str) -> Dict:
    """
    Check if current weather matches the reported disaster type.
    Uses OpenWeatherMap API to get real-time weather data.
    """
    if not OPENWEATHER_API_KEY:
        logger.warning("OPENWEATHER_API_KEY not configured")
        return {
            "weather_match": True,
            "current_weather": "Unknown",
            "location_name": "Unknown",
            "weather_score": 0.5,
            "note": "Weather verification disabled (no API key)"
        }
    
    try:
        res = httpx.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY},
            timeout=5
        )
        
        if res.status_code != 200:
            raise Exception(f"Weather API returned {res.status_code}")
        
        data = res.json()
        current_weather = data["weather"][0]["main"]
        location_name = data.get("name", "Unknown")
        
        expected_weather = DISASTER_WEATHER_MAP.get(hazard_type)
        
        if expected_weather is None:
            # Weather-independent disaster — neutral
            return {
                "weather_match": True,
                "current_weather": current_weather,
                "location_name": location_name,
                "weather_score": 0.5,
                "note": f"Weather-independent disaster. Current: {current_weather} at {location_name}"
            }
        
        match = current_weather in expected_weather
        return {
            "weather_match": match,
            "current_weather": current_weather,
            "location_name": location_name,
            "weather_score": 0.8 if match else 0.1,
            "note": f"Weather at {location_name}: {current_weather}. {'Matches' if match else 'MISMATCH for'} {hazard_type}"
        }
    
    except Exception as e:
        logger.error(f"Weather check failed: {e}")
        return {
            "weather_match": True,
            "current_weather": "Unknown",
            "location_name": "Unknown",
            "weather_score": 0.5,
            "note": f"Weather check failed: {str(e)}"
        }


def check_seasonal_context(hazard_type: str) -> Dict:
    """
    Check if this disaster type is in season for India.
    Based on historical patterns and monsoon cycles.
    """
    current_month = datetime.datetime.now().month
    season_months = DISASTER_SEASON_MAP.get(hazard_type)
    
    if season_months is None:
        return {
            "in_season": True,
            "season_score": 0.5,
            "note": "No seasonal pattern for this disaster type"
        }
    
    in_season = current_month in season_months
    
    month_names = {
        1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
    }
    
    return {
        "in_season": in_season,
        "season_score": 0.8 if in_season else 0.2,
        "note": f"{hazard_type} is {'IN' if in_season else 'OUT OF'} season (Current: {month_names[current_month]})"
    }


def check_news_context(lat: float, lon: float, hazard_type: str, state: str = None) -> Dict:
    """
    Cross-reference with news sources for recent disaster reports.
    Uses Tavily API if available (better results), falls back to Google News RSS.
    """
    # Try Tavily first if API key is configured
    if TAVILY_API_KEY:
        try:
            return _check_news_tavily(hazard_type, state)
        except Exception as e:
            logger.warning(f"Tavily news check failed, falling back to Google News: {e}")
    
    # Fallback to Google News RSS
    return _check_news_google_rss(hazard_type, state)


def _check_news_tavily(hazard_type: str, state: str = None) -> Dict:
    """
    Check news using Tavily API (AI-powered search).
    More accurate and relevant than RSS feeds.
    """
    try:
        location = state if state else "India"
        query = f"{hazard_type} disaster {location} recent"
        
        response = httpx.post(
            "https://api.tavily.com/search",
            json={
                "api_key": TAVILY_API_KEY,
                "query": query,
                "search_depth": "basic",
                "max_results": 5,
                "days": 2  # Last 2 days
            },
            timeout=10
        )
        
        if response.status_code != 200:
            raise Exception(f"Tavily API returned {response.status_code}")
        
        data = response.json()
        results = data.get("results", [])
        
        # Check if any results are relevant
        found = len(results) > 0
        
        # Calculate confidence based on number and relevance of results
        if len(results) >= 3:
            news_score = 0.8  # Multiple recent articles
        elif len(results) >= 1:
            news_score = 0.6  # Some coverage
        else:
            news_score = 0.3  # No recent news
        
        result_titles = [r.get("title", "") for r in results[:3]]
        
        return {
            "news_found": found,
            "news_score": news_score,
            "note": f"Tavily: {len(results)} recent article(s) found for {hazard_type} in {location}" if found else f"Tavily: No recent news for {hazard_type} in {location}",
            "sources": result_titles if found else []
        }
    
    except Exception as e:
        logger.error(f"Tavily news check failed: {e}")
        raise  # Re-raise to trigger fallback


def _check_news_google_rss(hazard_type: str, state: str = None) -> Dict:
    """
    Check news using Google News RSS feed (free fallback).
    Checks for news about this disaster type in India in the last 2 days.
    """
    try:
        # Build search query
        location = state if state else "India"
        query = f"{hazard_type.lower()} {location}"
        
        # Google News RSS feed (last 2 days)
        url = f"https://news.google.com/rss/search?q={query}+when:2d&hl=en-IN&gl=IN&ceid=IN:en"
        
        res = httpx.get(
            url,
            timeout=5,
            headers={"User-Agent": "TatSahayk/1.0"},
            follow_redirects=True
        )
        
        if res.status_code != 200:
            raise Exception(f"News API returned {res.status_code}")
        
        # Simple check — if recent news exists about this disaster type
        content = res.text.lower()
        hazard_keywords = [hazard_type.lower(), "disaster", "emergency"]
        
        found = any(keyword in content for keyword in hazard_keywords)
        
        return {
            "news_found": found,
            "news_score": 0.7 if found else 0.3,
            "note": f"Google News: Recent news {'FOUND' if found else 'NOT found'} for {hazard_type} in {location}",
            "sources": []
        }
    
    except Exception as e:
        logger.error(f"Google News check failed: {e}")
        return {
            "news_found": True,
            "news_score": 0.5,
            "note": f"News check failed: {str(e)}",
            "sources": []
        }


def calculate_combined_score(
    visual_score: float,
    weather_ctx: Dict,
    season_ctx: Dict,
    news_ctx: Dict,
    is_fake: bool,
    is_relevant: bool,
    location_plausible: bool,
    hazard_type: str
) -> tuple:
    """
    Calculate final authenticity score using weighted combination of all factors.
    
    Weights:
    - Visual analysis: 50%
    - Weather match: 25%
    - Seasonal pattern: 15%
    - News corroboration: 10%
    
    Returns:
        (final_score, status, summary)
    """
    # Base weighted score
    final_score = (
        visual_score * 0.50 +
        weather_ctx["weather_score"] * 0.25 +
        season_ctx["season_score"] * 0.15 +
        news_ctx["news_score"] * 0.10
    )
    
    # Apply hard penalties for critical failures
    if not is_relevant:
        final_score = min(final_score, 0.10)
    
    if is_fake:
        final_score = min(final_score, 0.15)
    
    if not location_plausible:
        final_score = min(final_score, 0.25)
    
    # Weather mismatch penalty (only for weather-dependent disasters)
    if not weather_ctx["weather_match"] and DISASTER_WEATHER_MAP.get(hazard_type):
        final_score = min(final_score, 0.35)
    
    # Out of season penalty
    if not season_ctx["in_season"]:
        final_score = min(final_score, 0.45)
    
    final_score = round(final_score, 2)
    
    # Determine status and prefix
    if final_score < 0.25:
        prefix = f"REJECTED [{int(final_score*100)}%]"
        status = "false"
    elif final_score < 0.55:
        prefix = f"LOW CONFIDENCE [{int(final_score*100)}%]"
        status = "pending"
    else:
        prefix = f"VERIFIED [{int(final_score*100)}%]"
        status = "pending"
    
    # Build comprehensive summary
    summary_parts = [
        f"Visual: {int(visual_score*100)}%",
        weather_ctx["note"],
        season_ctx["note"],
        news_ctx["note"]
    ]
    
    summary = f"{prefix} | " + " | ".join(summary_parts)
    
    return final_score, status, summary
