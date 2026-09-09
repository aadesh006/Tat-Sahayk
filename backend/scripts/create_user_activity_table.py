"""
Create user_activities table if it doesn't exist
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.models.user_activity import UserActivity

def create_user_activity_table():
    """Create the user_activities table"""
    print("Creating user_activities table...")
    
    try:
        # Create only the user_activities table
        UserActivity.__table__.create(bind=engine, checkfirst=True)
        print("✓ user_activities table created successfully!")
        
        # Verify table exists
        db = SessionLocal()
        try:
            result = db.execute("SELECT COUNT(*) FROM user_activities")
            count = result.scalar()
            print(f"✓ Table verified! Current row count: {count}")
        finally:
            db.close()
            
    except Exception as e:
        print(f"✗ Error creating table: {e}")
        raise

if __name__ == "__main__":
    create_user_activity_table()
