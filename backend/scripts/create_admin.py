import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.db.session import SessionLocal
from app.crud.user import create_user, get_user_by_email
from app.schemas.user import UserCreate

db = SessionLocal()
if not get_user_by_email(db, "admin@tatsahayk.gov.in"):
    create_user(db, UserCreate(
        email="admin@tatsahayk.gov.in",
        full_name="System Admin",
        password="ADMIN_SECRET_123",   # change this
        role="admin"
    ))
    print("Admin created")
db.close()