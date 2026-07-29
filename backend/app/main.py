import logging
import threading
from contextlib import asynccontextmanager
from typing import Optional
import app.db.base  # noqa: F401

from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import api_router
from app.api.health import router as health_router
from app.core.config import settings


logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler: Optional[BackgroundScheduler] = None

    if settings.ENABLE_SOCIAL_HARVESTER or settings.ENABLE_CLUSTER_ANALYSIS:
        scheduler = BackgroundScheduler(timezone="UTC")

        if settings.ENABLE_SOCIAL_HARVESTER:
            from scripts.harvest_social import harvest

            scheduler.add_job(
                harvest,
                trigger="interval",
                minutes=settings.SOCIAL_HARVEST_INTERVAL_MINUTES,
                id="social_harvester",
                replace_existing=True,
            )
            logger.info("Social harvester scheduled")

        if settings.ENABLE_CLUSTER_ANALYSIS:
            from app.services.cluster_analyzer import run_cluster_analysis

            scheduler.add_job(
                run_cluster_analysis,
                trigger="interval",
                minutes=settings.CLUSTER_ANALYSIS_INTERVAL_MINUTES,
                id="cluster_analysis",
                replace_existing=True,
            )
            logger.info("Cluster analysis scheduled")

        scheduler.start()

        if settings.ENABLE_SOCIAL_HARVESTER:
            from scripts.harvest_social import harvest
            threading.Thread(
                target=harvest,
                name="initial-social-harvest",
                daemon=True,
            ).start()

        if settings.ENABLE_CLUSTER_ANALYSIS:
            threading.Thread(
                target=run_cluster_analysis,
                name="initial-cluster-analysis",
                daemon=True,
            ).start()

    logger.info(
        "Tat-Sahayk backend started with AI provider '%s'",
        settings.AI_PROVIDER,
    )

    yield

    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)

    logger.info("Tat-Sahayk backend stopped")


app = FastAPI(
    title=settings.PROJECT_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

local_media_directory = settings.local_media_directory
local_media_directory.mkdir(
    parents=True,
    exist_ok=True,
)

app.mount(
    settings.local_media_url,
    StaticFiles(
        directory=str(local_media_directory),
    ),
    name="local-media",
)

logger.info(
    "Media storage provider: '%s'",
    settings.MEDIA_STORAGE_PROVIDER,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)

app.include_router(
    api_router,
    prefix=settings.API_V1_PREFIX,
)


@app.get("/", tags=["system"])
def read_root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "ai_provider": settings.AI_PROVIDER,
        "docs": "/docs",
        "health": "/health/ready",
        "media_storage_provider": settings.MEDIA_STORAGE_PROVIDER,
    }
