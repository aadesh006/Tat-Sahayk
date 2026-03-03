from fastapi import APIRouter
from app.api.v1.endpoints import auth, reports, media, social, comments, alerts, map_admin, ai_analysis

api_router = APIRouter()

# Auth Routes
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Reports Routes
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])

#media Routes
api_router.include_router(media.router, prefix="/media", tags=["media"])

#Social Post
api_router.include_router(social.router, prefix="/social", tags=["social"])

#Comments
api_router.include_router(comments.router, prefix="/reports",  tags=["comments"])

#Alerts
api_router.include_router(alerts.router,   prefix="/alerts",   tags=["alerts"])

#Ai Analysis
api_router.include_router(ai_analysis.router, prefix="/ai", tags=["ai"])

#Map Admin
api_router.include_router(map_admin.router, prefix="/map", tags=["map"])

api_router.include_router(ai_analysis.router, prefix="/ai", tags=["ai"])
api_router.include_router(map_admin.router,   prefix="/map", tags=["map"])