from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db.session import engine, Base, get_db
from app.models import user
from sqlalchemy import text
from app.api.api import api_router
from app.models import report
from app.models import media
from fastapi.staticfiles import StaticFiles

#Database Setup
from app.db.session import engine
from app.db.base import Base

# Create Tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tat-Sahayk API")

app.mount("/static", StaticFiles(directory="uploads"), name="static")

app.include_router(api_router, prefix="/api/v1") 

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