from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db.session import engine, Base, get_db
from app.models import user # Import models so Alembic/SQLAlchemy sees them
from sqlalchemy import text

# Create Tables automatically (In production, use Alembic instead!)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tat-Sahayk API")

@app.get("/")
def read_root():
    return {"status": "Tat-Sahayk Backend is Running"}

@app.get("/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    try:
        # Try to execute a simple query
        result = db.execute(text("SELECT 1"))
        return {"status": "Database Connected!", "result": result.scalar()}
    except Exception as e:
        return {"status": "Connection Failed", "error": str(e)}