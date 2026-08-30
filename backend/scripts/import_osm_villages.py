"""
Import real vulnerable villages from OpenStreetMap Overpass API.
Free API, no key required, covers all of India.
Run once to populate habitations with real village data.
"""
import httpx
import sys
import os
import time
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.red_zone import VulnerableHabitation
from app.models.user import User
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

# High-risk districts — bbox format: south,west,north,east
TARGET_DISTRICTS = [
    {
        "district": "Wayanad",
        "state": "Kerala",
        "bbox": "11.3,75.7,11.8,76.3",
        "hazards": ["landslide", "flood"],
        "base_priority": "IMMEDIATE"
    },
    {
        "district": "Chamoli",
        "state": "Uttarakhand",
        "bbox": "30.2,79.2,30.8,80.0",
        "hazards": ["flood", "landslide", "glacier_lake_outburst"],
        "base_priority": "IMMEDIATE"
    },
    {
        "district": "Kendrapara",
        "state": "Odisha",
        "bbox": "20.3,86.6,20.9,87.2",
        "hazards": ["cyclone", "coastal_erosion", "flood"],
        "base_priority": "SHORT_TERM"
    },
    {
        "district": "Majuli",
        "state": "Assam",
        "bbox": "26.8,93.8,27.1,94.5",
        "hazards": ["flood", "erosion"],
        "base_priority": "SHORT_TERM"
    },
    {
        "district": "Darbhanga",
        "state": "Bihar",
        "bbox": "25.8,85.8,26.3,86.5",
        "hazards": ["flood"],
        "base_priority": "MEDIUM_TERM"
    },
    {
        "district": "Raigad",
        "state": "Maharashtra",
        "bbox": "17.8,73.1,18.3,73.6",
        "hazards": ["landslide", "flood"],
        "base_priority": "SHORT_TERM"
    },
]

PRIORITY_EXPOSURE = {
    "IMMEDIATE": 0.90,
    "SHORT_TERM": 0.70,
    "MEDIUM_TERM": 0.50,
}

def fetch_villages(bbox: str, max_results: int = 15) -> list:
    """Fetch villages from OpenStreetMap Overpass API."""
    query = f"""
[out:json][timeout:30];
node["place"~"village|hamlet"]["name"]({bbox});
out body {max_results};
"""
    try:
        res = httpx.post(
            "https://overpass-api.de/api/interpreter",
            data=query.encode(),
            timeout=35,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if res.status_code == 200:
            return res.json().get("elements", [])
        else:
            print(f"  ⚠️  OSM API returned {res.status_code}")
            return []
    except Exception as e:
        print(f"  ⚠️  OSM fetch error: {e}")
        return []

def import_villages():
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "admin").first()
    admin_id = admin.id if admin else None

    total_added = 0
    total_skipped = 0

    for district_info in TARGET_DISTRICTS:
        print(f"\n📍 Fetching villages for {district_info['district']}, {district_info['state']}...")
        
        villages = fetch_villages(district_info["bbox"])
        print(f"   Found {len(villages)} villages from OpenStreetMap")

        for village in villages:
            tags = village.get("tags", {})
            name = tags.get("name") or tags.get("name:en")
            if not name:
                continue

            lat = village.get("lat")
            lon = village.get("lon")
            if not lat or not lon:
                continue

            # Skip if already exists
            existing = db.query(VulnerableHabitation).filter(
                VulnerableHabitation.name == name,
                VulnerableHabitation.district == district_info["district"]
            ).first()
            if existing:
                total_skipped += 1
                continue

            # Get population from OSM tags or estimate
            try:
                pop = int(tags.get("population", 0))
            except (ValueError, TypeError):
                pop = 0
            
            if pop == 0:
                pop = 250  # Default estimate for unlisted villages

            households = max(1, pop // 4)
            priority = district_info["base_priority"]
            exposure = PRIORITY_EXPOSURE[priority]

            point = Point(lon, lat)
            hab = VulnerableHabitation(
                name=name,
                district=district_info["district"],
                state=district_info["state"],
                location=from_shape(point, srid=4326),
                latitude=lat,
                longitude=lon,
                population=pop,
                households=households,
                hazard_types=district_info["hazards"],
                exposure_score=exposure,
                vulnerability_score=exposure - 0.10,
                priority=priority,
                priority_reason=f"Located in high-risk {district_info['district']} — {', '.join(district_info['hazards'][:2])} prone area. Source: OpenStreetMap.",
                relocation_status="pending",
                ai_assessment=None,
                created_by=admin_id
            )
            db.add(hab)
            total_added += 1
            print(f"   ✓ {name} ({pop} people, {priority})")

        db.commit()
        time.sleep(1)  # Be respectful to OSM API

    print(f"\n{'='*50}")
    print(f"✅ Import complete: {total_added} villages added, {total_skipped} skipped (already exist)")
    print(f"{'='*50}")
    db.close()

if __name__ == "__main__":
    import_villages()
