from fastapi import APIRouter
from app.api.v1.endpoints import auth, reports

api_router = APIRouter()

# Auth Routes
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Reports Routes
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])