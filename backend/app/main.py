from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
import threading

from app.core.config import settings
from app.api.api import api_router
from app.db.session import engine
from app.db.base import Base
from scripts.harvest_social import harvest
from app.services.cluster_analyzer import run_cluster_analysis

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    # Start scheduler with both jobs
    scheduler = BackgroundScheduler()
    scheduler.add_job(harvest, "interval", minutes=15, id="social_harvester")
    scheduler.add_job(run_cluster_analysis, "interval", minutes=15, id="bedrock_cluster_analysis")
    scheduler.start()
    print("Social Harvester Scheduler Started")
    print("Bedrock Cluster Analyzer Started")

    # Run cluster analysis once immediately on startup
    threading.Thread(target=run_cluster_analysis, daemon=True).start()

    yield

    scheduler.shutdown()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://tatsahayk.in",
        "https://www.tatsahayk.in"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "Tat-Sahayk Backend is Running"}