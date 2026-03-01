import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import app.db.base  # registers all models

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

ADMINS = [
    {
        "email":     "admin.mumbai@tatsahayk.gov.in",
        "full_name": "District Admin — Mumbai",
        "password":  "MUMBAI_ADMIN_123",
        "district":  "Mumbai",
        "state":     "Maharashtra",
    },
    {
        "email":     "admin.chennai@tatsahayk.gov.in",
        "full_name": "District Admin — Chennai",
        "password":  "CHENNAI_ADMIN_123",
        "district":  "Chennai",
        "state":     "Tamil Nadu",
    },
    {
        "email":     "admin.national@tatsahayk.gov.in",
        "full_name": "National Admin",
        "password":  "NATIONAL_ADMIN_123",
        "district":  None,   # national admin sees everything
        "state":     None,
    },
]

def create_admins():
    db = SessionLocal()
    try:
        for admin_data in ADMINS:
            existing = db.query(User).filter(
                User.email == admin_data["email"]
            ).first()

            if existing:
                existing.role             = "admin"
                existing.district         = admin_data["district"]
                existing.state            = admin_data["state"]
                existing.hashed_password  = get_password_hash(admin_data["password"])
                db.commit()
                print(f"✓ Reset: {admin_data['email']}")
            else:
                admin = User(
                    email           = admin_data["email"],
                    full_name       = admin_data["full_name"],
                    hashed_password = get_password_hash(admin_data["password"]),
                    role            = "admin",
                    district        = admin_data["district"],
                    state           = admin_data["state"],
                    is_active       = True
                )
                db.add(admin)
                db.commit()
                print(f"✓ Created: {admin_data['email']} / {admin_data['password']}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback; traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admins()