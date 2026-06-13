from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from datetime import datetime, date
import time
import logging
import sys
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import shutil
import os
import uuid
import hashlib

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
from src.inference.image_classifier import ImageHazardClassifier
from src.external.ocean_data_client import OceanDataClient

logger = logging.getLogger(__name__)


def serialize_for_json(obj: Any) -> Any:
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, np.bool_):
        return bool(obj)
    
    try:
        import pandas as pd
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        if isinstance(obj, pd.Series):
            return obj.to_dict()
        if isinstance(obj, pd.DataFrame):
            return obj.to_dict(orient='records')
    except ImportError:
        pass
    
    if isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    
    if isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    
    return obj



class MonitoringMiddleware(BaseHTTPMiddleware):
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            logger.info(
                f"{request.method} {request.url.path} "
                f"- Status: {response.status_code} "
                f"- Time: {process_time:.3f}s"
            )
            
            response.headers["X-Process-Time"] = str(process_time)
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"{request.method} {request.url.path} "
                f"- ERROR after {process_time:.3f}s: {e}",
                exc_info=True
            )
            raise


app = FastAPI(
    title="Tat-Sahayk ML Service",
    description="Ocean Hazard Detection and Analysis API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(MonitoringMiddleware)

predictor = None
hotspot_generator = None
credibility_scorer = None
geo_analyzer = None
image_classifier = None
ocean_client = None


def get_services():
    global predictor, hotspot_generator, credibility_scorer, geo_analyzer, image_classifier, ocean_client
    
    if predictor is None:
        logger.info("Initializing services...")
        
        predictor = get_predictor()
        hotspot_generator = HotspotGenerator()
        credibility_scorer = CredibilityScorer()
        geo_analyzer = GeospatialAnalyzer(use_kdtree=True)  # Use optimized KD-Tree
        image_classifier = ImageHazardClassifier()
        ocean_client = OceanDataClient(
            openweather_api_key=os.getenv("OPENWEATHER_API_KEY")
        )
        
        logger.info(" All services initialized")
    
    return predictor, hotspot_generator, credibility_scorer, geo_analyzer


class ConnectionManager:
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        message = serialize_for_json(message)
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket: {e}")


manager = ConnectionManager()

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    try:
        error_content = {
            "error": str(exc.detail),
            "status_code": exc.status_code,
            "timestamp": datetime.now().isoformat(),  
            "path": str(request.url.path),
            "method": request.method
        }
        error_content = serialize_for_json(error_content)
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_content
        )
        
    except Exception as e:
        logger.error(f"Error in HTTP exception handler: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Error handler failed",
                "detail": str(e),
                "timestamp": datetime.now().isoformat()
            }
        )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    try:
        logger.error(
            f"Unhandled exception: {type(exc).__name__}: {exc}",
            exc_info=True
        )
        error_content = {
            "error": "Internal server error",
            "type": type(exc).__name__,
            "detail": str(exc),
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url.path),
            "method": request.method
        }
        if settings.DEBUG:
            error_content["traceback"] = traceback.format_exc()

        error_content = serialize_for_json(error_content)
        
        return JSONResponse(
            status_code=500,
            content=error_content
        )
        
    except Exception as e:
        logger.critical(f"Critical error in exception handler: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Critical server error",
                "timestamp": datetime.now().isoformat()
            }
        )

@app.get("/", tags=["Root"])
async def root():
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
        logger.error(f"Error in analyze_text: {e}", exc_info=True)
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
        logger.error(f"Error in analyze_batch: {e}", exc_info=True)
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
            'data': serialize_for_json(response.dict())
        })
        
        return response
    
    except Exception as e:
        logger.error(f"Error in analyze_report: {e}", exc_info=True)
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
            HotspotResponse(**serialize_for_json(hotspot))
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
                'hotspots': serialize_for_json([h.dict() for h in hotspot_responses])
            }
        })
        
        return response
    
    except Exception as e:
        logger.error(f"Error in detect_hotspots: {e}", exc_info=True)
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
        logger.error(f"Error in get_model_info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/analyze/multimodal", tags=["Analysis"])
async def analyze_multimodal(
    text: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: UploadFile = File(None)
):
    try:
        results = {}
        text_request = TextAnalysisRequest(
            text=text,
            include_entities=True,
            include_sentiment=True
        )
        text_result = await analyze_text(text_request)
        results["text_analysis"] = serialize_for_json(text_result.dict())
        image_result = None
        if image:
            temp_filename = f"/tmp/{uuid.uuid4()}_{image.filename}"
            
            try:
                with open(temp_filename, "wb") as buffer:
                    shutil.copyfileobj(image.file, buffer)
                image_result = image_classifier.classify_image(temp_filename)
                results["image_analysis"] = serialize_for_json(image_result)
                consistency = image_classifier.verify_consistency(
                    image_path=temp_filename,
                    text_prediction=text_result.hazard_detection['hazard_type']
                )
                results["consistency_check"] = serialize_for_json(consistency)
                
            finally:
                if os.path.exists(temp_filename):
                    os.remove(temp_filename)
        else:
            results["image_analysis"] = None
            results["consistency_check"] = None

        verification = await ocean_client.verify_hazard_report(
            hazard_type=text_result.hazard_detection['hazard_type'],
            latitude=latitude,
            longitude=longitude
        )
        results["real_data_verification"] = serialize_for_json(verification)
        final = integrate_predictions(
            text_result.dict(),
            image_result,
            verification
        )
        results["final_prediction"] = serialize_for_json(final)
        
        return results
        
    except Exception as e:
        logger.error(f"Error in analyze_multimodal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/analyze/image", tags=["Analysis"])
async def analyze_image_only(image: UploadFile = File(...)):
    try:
        temp_filename = f"/tmp/{uuid.uuid4()}_{image.filename}"
        
        try:
            with open(temp_filename, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            result = image_classifier.classify_image(temp_filename)
            return serialize_for_json(result)
            
        finally:
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
                
    except Exception as e:
        logger.error(f"Error in analyze_image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/verify/report", tags=["Verification"])
async def verify_report_only(
    hazard_type: str,
    latitude: float,
    longitude: float
):
    try:
        result = await ocean_client.verify_hazard_report(
            hazard_type=hazard_type,
            latitude=latitude,
            longitude=longitude
        )
        return serialize_for_json(result)
        
    except Exception as e:
        logger.error(f"Error in verify_report: {e}", exc_info=True)
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
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


def integrate_predictions(text_result: dict, image_result: dict, verification: dict) -> dict:
    hazard_type = text_result["hazard_detection"]["hazard_type"]
    confidence = text_result["hazard_detection"]["confidence"]
    
    if image_result and image_result.get("hazard_type") == hazard_type:
        confidence = min(confidence * 1.3, 1.0)

    if verification.get("verified"):
        confidence = min(confidence * 1.5, 1.0)

    if image_result and image_result.get("hazard_type") != hazard_type:
        confidence *= 0.7
    
    return {
        "hazard_type": hazard_type,
        "confidence": float(confidence),
        "verified_by_real_data": verification.get("verified", False),
        "has_visual_confirmation": image_result is not None,
        "credibility_score": text_result.get("credibility_score", 0.5)
    }

@app.on_event("startup")
async def startup_event():
    logger.info("="*80)
    logger.info("Starting Tat-Sahayk ML Service")
    logger.info("="*80)
    get_services()  
    logger.info(" Service started successfully")
    logger.info("="*80)


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