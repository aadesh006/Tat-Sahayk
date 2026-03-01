from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.api.api import api_router
from app.db.session import engine
from app.db.base import Base
from scripts.harvest_social import harvest

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    scheduler = BackgroundScheduler()
    scheduler.add_job(harvest, 'interval', minutes=15)
    scheduler.start()
    print("Social Harvester Scheduler Started")
    yield
    scheduler.shutdown()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "Tat-Sahayk Backend is Running"}