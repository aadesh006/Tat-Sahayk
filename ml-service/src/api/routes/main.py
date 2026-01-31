from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import time
import logging
import sys
from pathlib import Path
from typing import List
import pandas as pd
from typing import Dict
from starlette.middleware.base import BaseHTTPMiddleware


sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from config.settings import settings
from src.api.models.request import (
    TextAnalysisRequest,
    BatchTextRequest,
    ReportAnalysisRequest,
    HotspotDetectionRequest,
    NearbyReportsRequest
)
from src.api.models.response import (
    HealthResponse,
    TextAnalysisResponse,
    BatchTextResponse,
    ReportAnalysisResponse,
    HotspotDetectionResponse,
    HotspotResponse,
    ErrorResponse,
    ModelInfoResponse
)
from src.inference.text_predictor import get_predictor
from src.analytics.hotspot_generator import HotspotGenerator
from src.analytics.credibility_scorer import CredibilityScorer
from src.analytics.geospatial_analysis import GeospatialAnalyzer

logger = logging.getLogger(__name__)


class MonitoringMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(
            f"{request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Time: {process_time:.3f}s"
        )
        response.headers["X-Process-Time"] = str(process_time)
        
        return response

app = FastAPI(
    title="Tat-Sahayk ML Service",
    description="Ocean Hazard Detection and Analysis API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
predictor = None
hotspot_generator = None
credibility_scorer = None
geo_analyzer = None

def get_services():
    global predictor, hotspot_generator, credibility_scorer, geo_analyzer
    
    if predictor is None:
        logger.info("Initializing services...")
        predictor = get_predictor()
        hotspot_generator = HotspotGenerator()
        credibility_scorer = CredibilityScorer()
        geo_analyzer = GeospatialAnalyzer()
        logger.info(" All services initialized")
    
    return predictor, hotspot_generator, credibility_scorer, geo_analyzer
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket: {e}")

manager = ConnectionManager()


app.add_middleware(MonitoringMiddleware)

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Tat-Sahayk ML Service",
        "status": "operational",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )

@app.post(
    "/api/v1/analyze/text",
    response_model=TextAnalysisResponse,
    tags=["Analysis"]
)
async def analyze_text(request: TextAnalysisRequest):
    try:
        pred, _, cred_scorer, _ = get_services()
        
        start_time = time.time()
        result = pred.predict(
            request.text,
            include_sentiment=request.include_sentiment,
            include_entities=request.include_entities
        )
        report_data = pd.Series({
            'text': request.text,
            'has_location': False,
            'has_media': False,
            'word_count': len(request.text.split()),
            'is_hazard': result['hazard_detection']['is_hazard'],
            'sentiment': result.get('sentiment', {}).get('sentiment', 'neutral'),
            'has_urgency_words': result.get('sentiment', {}).get('panic_word_count', 0) > 0
        })
        credibility = cred_scorer.score_report(report_data)
        
        processing_time = (time.time() - start_time) * 1000
        
        return TextAnalysisResponse(
            text=request.text,
            hazard_detection=result['hazard_detection'],
            sentiment=result.get('sentiment'),
            entities=result.get('entities'),
            credibility_score=float(credibility),
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        logger.error(f"Error in analyze_text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(
    "/api/v1/analyze/batch",
    response_model=BatchTextResponse,
    tags=["Analysis"]
)
async def analyze_batch(request: BatchTextRequest):
    try:
        pred, _, cred_scorer, _ = get_services()
        
        start_time = time.time()
        
        results = []
        for text in request.texts:
            result = pred.predict(
                text,
                include_sentiment=request.include_sentiment,
                include_entities=request.include_entities
            )
            report_data = pd.Series({
                'text': text,
                'has_location': False,
                'has_media': False,
                'word_count': len(text.split()),
                'is_hazard': result['hazard_detection']['is_hazard'],
                'sentiment': result.get('sentiment', {}).get('sentiment', 'neutral'),
                'has_urgency_words': result.get('sentiment', {}).get('panic_word_count', 0) > 0
            })
            credibility = cred_scorer.score_report(report_data)
            
            results.append(TextAnalysisResponse(
                text=text,
                hazard_detection=result['hazard_detection'],
                sentiment=result.get('sentiment'),
                entities=result.get('entities'),
                credibility_score=float(credibility),
                processing_time_ms=result['processing_time_ms']
            ))
        
        processing_time = (time.time() - start_time) * 1000
        
        return BatchTextResponse(
            results=results,
            total_count=len(results),
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        logger.error(f"Error in analyze_batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(
    "/api/v1/analyze/report",
    response_model=ReportAnalysisResponse,
    tags=["Analysis"]
)
async def analyze_report(request: ReportAnalysisRequest):
    try:
        pred, _, cred_scorer, _ = get_services()
        
        start_time = time.time()
        text_result = pred.predict(request.text)
        report_data = pd.Series({
            'text': request.text,
            'has_location': True,
            'has_media': request.has_media,
            'media_count': request.media_count,
            'author_followers': request.author_followers,
            'word_count': len(request.text.split()),
            'is_hazard': text_result['hazard_detection']['is_hazard'],
            'sentiment': text_result['sentiment']['sentiment'],
            'has_urgency_words': text_result['sentiment']['panic_word_count'] > 0,
            'total_engagement': 0
        })
        credibility = cred_scorer.score_report(report_data)
        
        processing_time = (time.time() - start_time) * 1000
        import hashlib
        report_id = hashlib.md5(
            f"{request.text}{request.timestamp}".encode()
        ).hexdigest()[:16]
        
        response = ReportAnalysisResponse(
            report_id=f"RPT_{report_id}",
            hazard_detection=text_result['hazard_detection'],
            sentiment=text_result['sentiment'],
            entities=text_result['entities'],
            credibility_score=float(credibility),
            location={
                'latitude': request.latitude,
                'longitude': request.longitude
            },
            metadata={
                'has_media': request.has_media,
                'media_count': request.media_count,
                'author_followers': request.author_followers,
                'timestamp': request.timestamp.isoformat(),
                'processing_time_ms': processing_time
            }
        )
        await manager.broadcast({
            'type': 'new_report',
            'data': response.dict()
        })
        
        return response
    
    except Exception as e:
        logger.error(f"Error in analyze_report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(
    "/api/v1/hotspots/detect",
    response_model=HotspotDetectionResponse,
    tags=["Hotspots"]
)
async def detect_hotspots(request: HotspotDetectionRequest):
    try:
        _, hotspot_gen, _, _ = get_services()
        
        start_time = time.time()

        df = pd.DataFrame(request.reports)
        if 'latitude' not in df.columns or 'longitude' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="Reports must include 'latitude' and 'longitude'"
            )
        hotspot_gen.min_reports = request.min_reports
        hotspot_gen.radius_km = request.radius_km
        
        hotspots = hotspot_gen.generate_hotspots(df)
        
        processing_time = (time.time() - start_time) * 1000
        hotspot_responses = [
            HotspotResponse(**hotspot)
            for hotspot in hotspots
        ]
        
        response = HotspotDetectionResponse(
            hotspots=hotspot_responses,
            total_count=len(hotspot_responses),
            processing_time_ms=processing_time
        )
        await manager.broadcast({
            'type': 'hotspots_detected',
            'data': {
                'count': len(hotspot_responses),
                'hotspots': [h.dict() for h in hotspot_responses]
            }
        })
        
        return response
    
    except Exception as e:
        logger.error(f"Error in detect_hotspots: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(
    "/api/v1/models/info",
    response_model=Dict[str, ModelInfoResponse],
    tags=["Models"]
)
async def get_model_info():
    try:
        pred, _, _, _ = get_services()
        
        return {
            "text_classifier": ModelInfoResponse(
                model_name="DistilBERT",
                model_type="transformer",
                status="loaded",
                loaded=True,
                metadata={
                    "num_labels": len(pred.id2label),
                    "labels": list(pred.id2label.values())
                }
            ),
            "sentiment_analyzer": ModelInfoResponse(
                model_name="VADER",
                model_type="rule_based",
                status="loaded",
                loaded=True,
                metadata={
                    "type": "sentiment + panic detection"
                }
            ),
            "ner": ModelInfoResponse(
                model_name="spaCy",
                model_type="transformer",
                status="loaded",
                loaded=True,
                metadata={
                    "entities": ["locations", "organizations", "dates", "times"]
                }
            )
        }
    
    except Exception as e:
        logger.error(f"Error in get_model_info: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            detail=str(exc)
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc)
        ).dict()
    )

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Tat-Sahayk ML Service")
    get_services()
    logger.info("Service started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Tat-Sahayk ML Service")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level="info"
    )