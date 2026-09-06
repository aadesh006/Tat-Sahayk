import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def create_user_activity_table():
    engine = create_engine(str(settings.DATABASE_URL))
    
    with engine.connect() as conn:
        # Create user_activities table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_activities (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                activity_type VARCHAR NOT NULL,
                district VARCHAR,
                state VARCHAR,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        
        # Create indexes for performance
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_activities_district ON user_activities(district);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp);
        """))
        
        conn.commit()
        print("✅ User activity table created successfully!")

if __name__ == "__main__":
    create_user_activity_table()
