"""
Quick script to verify the ai_analysis_breakdown column exists
"""
import sys
from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def verify_column():
    print("Verifying database schema...")
    
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)
    
    # Get columns for reports table
    columns = inspector.get_columns('reports')
    column_names = [col['name'] for col in columns]
    
    print(f"\nFound {len(columns)} columns in 'reports' table:")
    for col in columns:
        print(f"  - {col['name']}: {col['type']}")
    
    # Check for our new column
    if 'ai_analysis_breakdown' in column_names:
        print("\n✓ SUCCESS: ai_analysis_breakdown column exists!")
        print("\nNext step: Restart your backend server to reload the schema.")
        print("  1. Stop the backend (Ctrl+C)")
        print("  2. Start it again: uvicorn app.main:app --reload")
        return True
    else:
        print("\n✗ ERROR: ai_analysis_breakdown column not found!")
        print("Run the migration: psql $DATABASE_URL < backend/migrations/add_analysis_breakdown.sql")
        return False

if __name__ == "__main__":
    success = verify_column()
    sys.exit(0 if success else 1)
