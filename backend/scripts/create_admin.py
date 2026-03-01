import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import app.db.base

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@tatsahayk.gov.in").first()
        if existing:
            print(f"Admin already exists. Resetting role and password...")
            existing.role = "admin"
            existing.hashed_password = get_password_hash("MKC_ADMIN")
            db.commit()
            print("✓ Admin credentials reset successfully")
            return

        admin = User(
            email="admin@tatsahayk.gov.in",
            full_name="System Admin",
            hashed_password=get_password_hash("MKC_ADMIN"),
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("✓ Admin created successfully")
        print("  Email:    admin@tatsahayk.gov.in")
        print("  Password: MKC_ADMIN")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()