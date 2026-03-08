"""
Fix rescue_deployments table to make report_id nullable
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine
from sqlalchemy import text

def fix_table():
    print("Fixing rescue_deployments table...")
    try:
        with engine.connect() as conn:
            # Make report_id nullable
            conn.execute(text("ALTER TABLE rescue_deployments ALTER COLUMN report_id DROP NOT NULL;"))
            conn.commit()
            print("✓ Table fixed successfully!")
            print("  - report_id is now nullable")
        
    except Exception as e:
        print(f"✗ Error fixing table: {e}")
        raise

if __name__ == "__main__":
    fix_table()
