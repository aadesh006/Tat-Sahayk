"""
Create tables for rescue deployments and shelters
Run this script to add the new tables to your database
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine
from app.db.base import Base

def create_tables():
    print("Creating map resources tables...")
    try:
        # Import all models to ensure they're registered
        from app.models.rescue_deployment import RescueDeployment, Shelter
        from app.models.report import Report
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created successfully!")
        print("  - rescue_deployments")
        print("  - shelters")
        
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        raise

if __name__ == "__main__":
    create_tables()
    