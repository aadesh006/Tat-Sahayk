from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.db.session import engine, Base, get_db
from app.models import user
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.api import api_router
from app.db.session import engine
from app.db.base import Base

from apscheduler.schedulers.background import BackgroundScheduler
from scripts.harvest_social import harvest
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Tat-Sahayk API")

#CORS CONFIGURATION
origins = [
    "http://localhost:5173",  # Default for Vite
    "http://localhost:3000",  # Default for Create React App
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, PUT, DELETE)
    allow_headers=["*"], # Allows all headers
)

# Include routers
app.include_router(api_router, prefix="/api/v1")

# Define the Lifespan (Startup/Shutdown logic)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP: Create DB tables
    Base.metadata.create_all(bind=engine)

    scheduler = BackgroundScheduler()
    # Run 'harvest' every 15 minutes
    scheduler.add_job(harvest, 'interval', minutes=15)
    scheduler.start()
    print("Social Harvester Scheduler Started (Every 15 mins)")
    
    yield
    
    #SHUTDOWN
    scheduler.shutdown()
    print("Scheduler Shut Down")

# Attach lifespan to FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# Include Routers
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "Tat-Sahayk Backend is Running"}

@app.get("/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    try:

        result = db.execute(text("SELECT 1"))
        return {"status": "Database Connected!", "result": result.scalar()}
    except Exception as e:
        return {"status": "Connection Failed", "error": str(e)}