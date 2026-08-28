"""
Complete setup and seeding script for Red Zone Management
1. Fixes database constraints (zone_code)
2. Clears existing data
3. Seeds comprehensive sample data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from datetime import datetime, timezone, timedelta
from app.db.session import SessionLocal
from app.db.base import Base
from app.models.red_zone import HazardZone, RelocationSite, VulnerableHabitation
from app.models.user import User
from geoalchemy2.shape import from_shape
from shapely.geometry import Point, Polygon

def fix_database_constraints():
    """Fix ALL NOT NULL constraints for columns not in our models - COMPREHENSIVE"""
    db = SessionLocal()
    try:
        print("🔧 Fixing database constraints (comprehensive scan)...")
        
        # Fix ALL extra columns with NOT NULL constraints across all 3 tables
        db.execute(text("""
            DO $$ 
            DECLARE
                col RECORD;
            BEGIN
                -- Fix hazard_zones extra columns
                FOR col IN 
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='hazard_zones' 
                    AND column_name IN ('zone_code', 'risk_level', 'severity', 'code')
                    AND is_nullable = 'NO'
                LOOP
                    EXECUTE format('ALTER TABLE hazard_zones ALTER COLUMN %I DROP NOT NULL', col.column_name);
                    EXECUTE format('ALTER TABLE hazard_zones ALTER COLUMN %I SET DEFAULT NULL', col.column_name);
                    RAISE NOTICE 'Fixed hazard_zones.%', col.column_name;
                END LOOP;
                
                -- Fix relocation_sites extra columns
                FOR col IN 
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='relocation_sites' 
                    AND column_name IN ('site_code', 'code', 'site_id')
                    AND is_nullable = 'NO'
                LOOP
                    EXECUTE format('ALTER TABLE relocation_sites ALTER COLUMN %I DROP NOT NULL', col.column_name);
                    EXECUTE format('ALTER TABLE relocation_sites ALTER COLUMN %I SET DEFAULT NULL', col.column_name);
                    RAISE NOTICE 'Fixed relocation_sites.%', col.column_name;
                END LOOP;
                
                -- Fix vulnerable_habitations extra columns  
                FOR col IN 
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='vulnerable_habitations' 
                    AND column_name IN ('habitation_code', 'code', 'relocation_priority', 'urgency')
                    AND is_nullable = 'NO'
                LOOP
                    EXECUTE format('ALTER TABLE vulnerable_habitations ALTER COLUMN %I DROP NOT NULL', col.column_name);
                    EXECUTE format('ALTER TABLE vulnerable_habitations ALTER COLUMN %I SET DEFAULT NULL', col.column_name);
                    RAISE NOTICE 'Fixed vulnerable_habitations.%', col.column_name;
                END LOOP;
                
                RAISE NOTICE '✓ Fixed all NOT NULL constraints for extra columns';
            END $$;
        """))
        db.commit()
        print("✓ All database constraints fixed")
    except Exception as e:
        print(f"⚠️  Constraint fix warning: {e}")
        db.rollback()
    finally:
        db.close()

def clear_existing_data():
    """Clear existing Red Zone data"""
    db = SessionLocal()
    try:
        print("\n🗑️  Clearing existing data...")
        
        deleted_habitations = db.query(VulnerableHabitation).delete()
        deleted_sites = db.query(RelocationSite).delete()
        deleted_zones = db.query(HazardZone).delete()
        
        db.commit()
        
        print(f"✓ Deleted {deleted_habitations} habitations")
        print(f"✓ Deleted {deleted_sites} sites")
        print(f"✓ Deleted {deleted_zones} zones")
    except Exception as e:
        print(f"❌ Error clearing data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def seed_hazard_zones():
    """Seed hazard zones with realistic Indian disaster areas"""
    db = SessionLocal()
    
    # Get admin user for created_by
    admin_user = db.query(User).filter(User.role == "admin").first()
    admin_id = admin_user.id if admin_user else None
    
    zones_data = [
        {
            "name": "Wayanad Landslide Zone",
            "district": "Wayanad",
            "state": "Kerala",
            "center_lat": 11.5700,
            "center_lon": 76.0200,
            "intensity": "critical",
            "hazard_types": ["landslide", "flood"],
            "population_at_risk": 800,
            "affected_area_sqkm": 5.0,
            "radius_km": 1.5,
            "last_incident": datetime.now(timezone.utc) - timedelta(days=30),
            "ai_confidence": 0.92
        },
        {
            "name": "Chamoli Glacier Risk Zone",
            "district": "Chamoli",
            "state": "Uttarakhand",
            "center_lat": 30.4750,
            "center_lon": 79.6650,
            "intensity": "high",
            "hazard_types": ["flood", "glacier_lake_outburst", "landslide"],
            "population_at_risk": 530,
            "affected_area_sqkm": 8.0,
            "radius_km": 2.0,
            "last_incident": datetime.now(timezone.utc) - timedelta(days=180),
            "ai_confidence": 0.88
        },
        {
            "name": "Kendrapara Coastal Erosion Zone",
            "district": "Kendrapara",
            "state": "Odisha",
            "center_lat": 20.6000,
            "center_lon": 87.0000,
            "intensity": "high",
            "hazard_types": ["cyclone", "coastal_erosion", "flood"],
            "population_at_risk": 1070,
            "affected_area_sqkm": 12.0,
            "radius_km": 2.5,
            "last_incident": datetime.now(timezone.utc) - timedelta(days=120),
            "ai_confidence": 0.85
        },
        {
            "name": "Mumbai Flood Prone Area",
            "district": "Mumbai Suburban",
            "state": "Maharashtra",
            "center_lat": 19.0760,
            "center_lon": 72.8777,
            "intensity": "high",
            "hazard_types": ["flood", "storm"],
            "population_at_risk": 2500,
            "affected_area_sqkm": 15.0,
            "radius_km": 3.0,
            "last_incident": datetime.now(timezone.utc) - timedelta(days=90),
            "ai_confidence": 0.80
        },
        {
            "name": "Assam Riverbank Erosion Zone",
            "district": "Majuli",
            "state": "Assam",
            "center_lat": 26.9500,
            "center_lon": 94.1667,
            "intensity": "medium",
            "hazard_types": ["flood", "erosion"],
            "population_at_risk": 890,
            "affected_area_sqkm": 10.0,
            "radius_km": 2.2,
            "last_incident": datetime.now(timezone.utc) - timedelta(days=60),
            "ai_confidence": 0.78
        }
    ]
    
    try:
        print("\n🏔️  Seeding Hazard Zones...")
        
        for zone_data in zones_data:
            # Create circular polygon approximation
            center = Point(zone_data["center_lon"], zone_data["center_lat"])
            radius_degrees = zone_data["radius_km"] / 111  # Rough conversion km to degrees
            circle = center.buffer(radius_degrees)
            
            new_zone = HazardZone(
                name=zone_data["name"],
                district=zone_data["district"],
                state=zone_data["state"],
                hazard_types=zone_data["hazard_types"],
                intensity=zone_data["intensity"],
                boundary=from_shape(circle, srid=4326),
                center_lat=zone_data["center_lat"],
                center_lon=zone_data["center_lon"],
                population_at_risk=zone_data["population_at_risk"],
                affected_area_sqkm=zone_data["affected_area_sqkm"],
                ai_confidence=zone_data["ai_confidence"],
                ai_reasoning=f"AI-detected high-risk zone based on historical incidents and terrain analysis",
                source="manual",
                last_incident_date=zone_data["last_incident"],
                created_by=admin_id
            )
            db.add(new_zone)
            print(f"  ✓ {zone_data['name']} ({zone_data['intensity'].upper()})")
        
        db.commit()
        print(f"✓ Created {len(zones_data)} hazard zones")
        
    except Exception as e:
        print(f"❌ Error seeding zones: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def seed_relocation_sites():
    """Seed relocation sites with infrastructure"""
    db = SessionLocal()
    
    admin_user = db.query(User).filter(User.role == "admin").first()
    admin_id = admin_user.id if admin_user else None
    
    sites_data = [
        {
            "name": "Kalpetta Resettlement Colony",
            "district": "Wayanad",
            "state": "Kerala",
            "lat": 11.6083,
            "lon": 76.0831,
            "carrying_capacity": 200,
            "current_occupancy": 0,
            "facilities": ["water", "electricity", "road", "school", "health_center"],
            "land_area_sqkm": 1.2,
            "suitability_score": 0.88
        },
        {
            "name": "Joshimath Safe Zone",
            "district": "Chamoli",
            "state": "Uttarakhand",
            "lat": 30.5558,
            "lon": 79.5645,
            "carrying_capacity": 150,
            "current_occupancy": 25,
            "facilities": ["water", "electricity", "road", "hospital"],
            "land_area_sqkm": 0.8,
            "suitability_score": 0.82
        },
        {
            "name": "Bhubaneswar Cyclone Shelter",
            "district": "Khordha",
            "state": "Odisha",
            "lat": 20.2961,
            "lon": 85.8245,
            "carrying_capacity": 500,
            "current_occupancy": 0,
            "facilities": ["water", "electricity", "road", "school", "hospital", "market"],
            "land_area_sqkm": 2.5,
            "suitability_score": 0.92
        },
        {
            "name": "Jorhat Relocation Township",
            "district": "Jorhat",
            "state": "Assam",
            "lat": 26.7571,
            "lon": 94.2037,
            "carrying_capacity": 400,
            "current_occupancy": 50,
            "facilities": ["water", "electricity", "road", "school", "health_center", "market"],
            "land_area_sqkm": 2.0,
            "suitability_score": 0.85
        },
        {
            "name": "Muzaffarpur Flood Relief Colony",
            "district": "Muzaffarpur",
            "state": "Bihar",
            "lat": 26.1225,
            "lon": 85.3647,
            "carrying_capacity": 600,
            "current_occupancy": 100,
            "facilities": ["water", "electricity", "road", "school"],
            "land_area_sqkm": 3.0,
            "suitability_score": 0.78
        },
        {
            "name": "Navi Mumbai Rehabilitation Center",
            "district": "Thane",
            "state": "Maharashtra",
            "lat": 19.0330,
            "lon": 73.0297,
            "carrying_capacity": 800,
            "current_occupancy": 150,
            "facilities": ["water", "electricity", "road", "school", "hospital", "market", "transport"],
            "land_area_sqkm": 4.0,
            "suitability_score": 0.90
        },
        {
            "name": "Dehradun Emergency Settlement",
            "district": "Dehradun",
            "state": "Uttarakhand",
            "lat": 30.3165,
            "lon": 78.0322,
            "carrying_capacity": 300,
            "current_occupancy": 0,
            "facilities": ["water", "electricity", "road", "health_center"],
            "land_area_sqkm": 1.5,
            "suitability_score": 0.83
        }
    ]
    
    try:
        print("\n🏘️  Seeding Relocation Sites...")
        
        for site_data in sites_data:
            point = Point(site_data["lon"], site_data["lat"])
            
            new_site = RelocationSite(
                name=site_data["name"],
                district=site_data["district"],
                state=site_data["state"],
                location=from_shape(point, srid=4326),
                latitude=site_data["lat"],
                longitude=site_data["lon"],
                carrying_capacity=site_data["carrying_capacity"],
                current_occupancy=site_data["current_occupancy"],
                available_capacity=site_data["carrying_capacity"] - site_data["current_occupancy"],
                facilities=site_data["facilities"],
                hazard_free_radius_km=5.0,
                land_area_sqkm=site_data["land_area_sqkm"],
                suitability_score=site_data["suitability_score"],
                ai_assessment=f"Safe zone with {len(site_data['facilities'])} facilities. Capacity: {site_data['carrying_capacity']} households.",
                created_by=admin_id
            )
            db.add(new_site)
            print(f"  ✓ {site_data['name']} (Capacity: {site_data['carrying_capacity']})")
        
        db.commit()
        print(f"✓ Created {len(sites_data)} relocation sites")
        
    except Exception as e:
        print(f"❌ Error seeding sites: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def seed_vulnerable_habitations():
    """Seed vulnerable habitations across India"""
    db = SessionLocal()
    
    admin_user = db.query(User).filter(User.role == "admin").first()
    admin_id = admin_user.id if admin_user else None
    
    habitations_data = [
        # Kerala - Wayanad
        {
            "name": "Mundakkai Village",
            "district": "Wayanad",
            "state": "Kerala",
            "lat": 11.5667,
            "lon": 76.0167,
            "population": 280,
            "households": 70,
            "hazard_types": ["landslide", "flood"],
            "priority": "IMMEDIATE",
            "timeline": 3
        },
        {
            "name": "Chooralmala",
            "district": "Wayanad",
            "state": "Kerala",
            "lat": 11.5750,
            "lon": 76.0250,
            "population": 520,
            "households": 130,
            "hazard_types": ["landslide"],
            "priority": "IMMEDIATE",
            "timeline": 3
        },
        # Uttarakhand - Chamoli
        {
            "name": "Raini Village",
            "district": "Chamoli",
            "state": "Uttarakhand",
            "lat": 30.4833,
            "lon": 79.6833,
            "population": 190,
            "households": 50,
            "hazard_types": ["flood", "landslide", "glacier_lake_outburst"],
            "priority": "IMMEDIATE",
            "timeline": 3
        },
        {
            "name": "Tapovan Settlement",
            "district": "Chamoli",
            "state": "Uttarakhand",
            "lat": 30.4667,
            "lon": 79.6500,
            "population": 340,
            "households": 85,
            "hazard_types": ["flood", "glacier_lake_outburst"],
            "priority": "SHORT_TERM",
            "timeline": 6
        },
        # Odisha - Coastal
        {
            "name": "Satabhaya",
            "district": "Kendrapara",
            "state": "Odisha",
            "lat": 20.6833,
            "lon": 87.0333,
            "population": 650,
            "households": 160,
            "hazard_types": ["cyclone", "coastal_erosion", "flood"],
            "priority": "SHORT_TERM",
            "timeline": 6
        },
        {
            "name": "Pentha Village",
            "district": "Kendrapara",
            "state": "Odisha",
            "lat": 20.5167,
            "lon": 86.9167,
            "population": 420,
            "households": 105,
            "hazard_types": ["cyclone", "flood"],
            "priority": "SHORT_TERM",
            "timeline": 6
        },
        # Assam - Flood prone
        {
            "name": "Majuli Gaon",
            "district": "Majuli",
            "state": "Assam",
            "lat": 26.9500,
            "lon": 94.1667,
            "population": 890,
            "households": 220,
            "hazard_types": ["flood", "erosion"],
            "priority": "MEDIUM_TERM",
            "timeline": 12
        },
        {
            "name": "Dhemaji Riverside",
            "district": "Dhemaji",
            "state": "Assam",
            "lat": 27.4833,
            "lon": 94.5667,
            "population": 740,
            "households": 185,
            "hazard_types": ["flood"],
            "priority": "MEDIUM_TERM",
            "timeline": 12
        },
        # Bihar - Kosi floods
        {
            "name": "Kusheshwar Asthan",
            "district": "Darbhanga",
            "state": "Bihar",
            "lat": 26.0167,
            "lon": 86.0833,
            "population": 1200,
            "households": 300,
            "hazard_types": ["flood"],
            "priority": "MEDIUM_TERM",
            "timeline": 12
        },
        {
            "name": "Manikpur Diara",
            "district": "Saran",
            "state": "Bihar",
            "lat": 25.8000,
            "lon": 84.9167,
            "population": 560,
            "households": 140,
            "hazard_types": ["flood", "erosion"],
            "priority": "MEDIUM_TERM",
            "timeline": 12
        },
        # Maharashtra
        {
            "name": "Taliye Village",
            "district": "Raigad",
            "state": "Maharashtra",
            "lat": 17.9333,
            "lon": 73.3167,
            "population": 170,
            "households": 45,
            "hazard_types": ["landslide", "flood"],
            "priority": "SHORT_TERM",
            "timeline": 6
        },
        {
            "name": "Mumbai Slum Cluster A",
            "district": "Mumbai Suburban",
            "state": "Maharashtra",
            "lat": 19.0896,
            "lon": 72.8656,
            "population": 3500,
            "households": 875,
            "hazard_types": ["flood", "storm"],
            "priority": "IMMEDIATE",
            "timeline": 3
        },
        # Tamil Nadu
        {
            "name": "Kottaipattinam",
            "district": "Pudukkottai",
            "state": "Tamil Nadu",
            "lat": 10.0833,
            "lon": 79.4333,
            "population": 480,
            "households": 120,
            "hazard_types": ["cyclone", "coastal_erosion", "flood"],
            "priority": "MEDIUM_TERM",
            "timeline": 12
        },
        # Manipur
        {
            "name": "Noney Village",
            "district": "Noney",
            "state": "Manipur",
            "lat": 24.7500,
            "lon": 93.5833,
            "population": 310,
            "households": 78,
            "hazard_types": ["landslide", "earthquake"],
            "priority": "SHORT_TERM",
            "timeline": 6
        },
        # Gujarat
        {
            "name": "Jakhau Coastal",
            "district": "Kutch",
            "state": "Gujarat",
            "lat": 23.2167,
            "lon": 68.7167,
            "population": 390,
            "households": 98,
            "hazard_types": ["cyclone", "flood"],
            "priority": "MEDIUM_TERM",
            "timeline": 12
        },
        # West Bengal
        {
            "name": "Sundarbans Settlement",
            "district": "South 24 Parganas",
            "state": "West Bengal",
            "lat": 21.9497,
            "lon": 88.8328,
            "population": 620,
            "households": 155,
            "hazard_types": ["cyclone", "flood", "storm_surge"],
            "priority": "SHORT_TERM",
            "timeline": 6
        }
    ]
    
    try:
        print("\n🏡 Seeding Vulnerable Habitations...")
        
        for hab_data in habitations_data:
            point = Point(hab_data["lon"], hab_data["lat"])
            
            # Set exposure and vulnerability based on priority
            if hab_data["priority"] == "IMMEDIATE":
                exposure = 0.9
                vulnerability = 0.85
            elif hab_data["priority"] == "SHORT_TERM":
                exposure = 0.7
                vulnerability = 0.65
            else:
                exposure = 0.5
                vulnerability = 0.45
            
            new_habitation = VulnerableHabitation(
                name=hab_data["name"],
                district=hab_data["district"],
                state=hab_data["state"],
                location=from_shape(point, srid=4326),
                latitude=hab_data["lat"],
                longitude=hab_data["lon"],
                population=hab_data["population"],
                households=hab_data["households"],
                hazard_types=hab_data["hazard_types"],
                exposure_score=exposure,
                vulnerability_score=vulnerability,
                priority=hab_data["priority"],
                priority_reason=f"High exposure to {', '.join(hab_data['hazard_types'][:2])}",
                estimated_timeline_months=hab_data["timeline"],
                relocation_status="pending",
                ai_assessment=f"Settlement of {hab_data['population']} people at risk from {', '.join(hab_data['hazard_types'])}",
                created_by=admin_id
            )
            db.add(new_habitation)
            print(f"  ✓ {hab_data['name']} ({hab_data['priority']}) - {hab_data['population']} people")
        
        db.commit()
        print(f"✓ Created {len(habitations_data)} vulnerable habitations")
        
    except Exception as e:
        print(f"❌ Error seeding habitations: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def print_summary():
    """Print summary of seeded data"""
    db = SessionLocal()
    try:
        zones = db.query(HazardZone).count()
        sites = db.query(RelocationSite).count()
        habitations = db.query(VulnerableHabitation).count()
        
        immediate = db.query(VulnerableHabitation).filter(VulnerableHabitation.priority == "IMMEDIATE").count()
        short_term = db.query(VulnerableHabitation).filter(VulnerableHabitation.priority == "SHORT_TERM").count()
        medium_term = db.query(VulnerableHabitation).filter(VulnerableHabitation.priority == "MEDIUM_TERM").count()
        
        print("\n" + "="*60)
        print("📊 RED ZONE MANAGEMENT - DATA SUMMARY")
        print("="*60)
        print(f"🏔️  Hazard Zones:              {zones}")
        print(f"🏘️  Relocation Sites:           {sites}")
        print(f"🏡 Vulnerable Habitations:     {habitations}")
        print(f"   ├─ 🔴 Immediate Priority:    {immediate}")
        print(f"   ├─ 🟠 Short Term Priority:   {short_term}")
        print(f"   └─ 🟡 Medium Term Priority:  {medium_term}")
        print("="*60)
        print("✅ Database seeding complete!")
        print("🌐 Refresh your browser to see the data")
        print("="*60)
        
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Starting Red Zone Management Setup & Seed Script")
    print("="*60)
    
    try:
        # Step 1: Fix database constraints
        fix_database_constraints()
        
        # Step 2: Clear existing data
        clear_existing_data()
        
        # Step 3: Seed hazard zones
        seed_hazard_zones()
        
        # Step 4: Seed relocation sites
        seed_relocation_sites()
        
        # Step 5: Seed vulnerable habitations
        seed_vulnerable_habitations()
        
        # Step 6: Print summary
        print_summary()
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
