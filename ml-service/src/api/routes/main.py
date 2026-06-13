"""
Tat-Sahayk ML Service — Main FastAPI Application
Provides text analysis, image classification, hotspot detection,
real-data verification, and credibility scoring.
"""
from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect,
    UploadFile, File, Form, Request,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, date
import time
import logging
import sys
import traceback
from pathlib import Path
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import shutil
import os
import uuid
import hashlib

# Fix path so we can import from project root
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from config.settings import settings
from src.api.models.request import (
    TextAnalysisRequest,
    BatchTextRequest,
    ReportAnalysisRequest,
    HotspotDetectionRequest,
)
from src.api.models.response import (
    HealthResponse,
    TextAnalysisResponse,
    BatchTextResponse,
    ReportAnalysisResponse,
    HotspotDetectionResponse,
    HotspotResponse,
    ErrorResponse,
    ModelInfoResponse,
)
from src.inference.text_predictor import get_predictor

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
#  JSON Serialisation helper
# ═══════════════════════════════════════════════════════════════════════════════
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
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    if isinstance(obj, pd.Series):
        return obj.to_dict()
    if isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient="records")
    if isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    return obj


# ═══════════════════════════════════════════════════════════════════════════════
#  Application
# ═══════════════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="Tat-Sahayk ML Service",
    description="Ocean Hazard Detection and Analysis API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════
#  Lazy-loaded global services
# ═══════════════════════════════════════════════════════════════════════════════
_predictor = None
_hotspot_generator = None
_credibility_scorer = None
_geo_analyzer = None
_image_classifier = None
_ocean_client = None


def _get_predictor():
    global _predictor
    if _predictor is None:
        _predictor = get_predictor()
    return _predictor


def _get_hotspot_generator():
    global _hotspot_generator
    if _hotspot_generator is None:
        from src.analytics.hotspot_generator import HotspotGenerator
        _hotspot_generator = HotspotGenerator()
    return _hotspot_generator


def _get_credibility_scorer():
    global _credibility_scorer
    if _credibility_scorer is None:
        from src.analytics.credibility_scorer import CredibilityScorer
        _credibility_scorer = CredibilityScorer()
    return _credibility_scorer


def _get_geo_analyzer():
    global _geo_analyzer
    if _geo_analyzer is None:
        from src.analytics.geospatial_analysis import GeospatialAnalyzer
        _geo_analyzer = GeospatialAnalyzer(use_kdtree=True)
    return _geo_analyzer


def _get_image_classifier():
    """Lazy-load CLIP image classifier (downloads ~600 MB on first call)."""
    global _image_classifier
    if _image_classifier is None:
        from src.inference.image_classifier import ImageHazardClassifier
        _image_classifier = ImageHazardClassifier()
    return _image_classifier


def _get_ocean_client():
    """Lazy-load ocean data client for real-data verification."""
    global _ocean_client
    if _ocean_client is None:
        from src.external.ocean_data_client import OceanDataClient
        _ocean_client = OceanDataClient(
            openweather_api_key=os.getenv("OPENWEATHER_API_KEY")
        )
    return _ocean_client


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket manager
# ═══════════════════════════════════════════════════════════════════════════════
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        message = serialize_for_json(message)
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════
#  Exception handlers
# ═══════════════════════════════════════════════════════════════════════════════
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=serialize_for_json({
            "error": str(exc.detail),
            "status_code": exc.status_code,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url.path),
        }),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {type(exc).__name__}: {exc}", exc_info=True)
    content = {
        "error": "Internal server error",
        "detail": str(exc),
        "timestamp": datetime.now().isoformat(),
        "path": str(request.url.path),
    }
    if settings.DEBUG:
        content["traceback"] = traceback.format_exc()
    return JSONResponse(status_code=500, content=serialize_for_json(content))


# ═══════════════════════════════════════════════════════════════════════════════
#  Root / Health
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "Tat-Sahayk ML Service",
        "status": "operational",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  Text Analysis
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/v1/analyze/text", response_model=TextAnalysisResponse, tags=["Analysis"])
async def analyze_text(request: TextAnalysisRequest):
    try:
        pred = _get_predictor()
        cred = _get_credibility_scorer()

        start_time = time.time()
        result = pred.predict(
            request.text,
            include_sentiment=request.include_sentiment,
            include_entities=request.include_entities,
        )

        raw_sent = result.get("sentiment", "neutral")
        sent_label = raw_sent if isinstance(raw_sent, str) else (
            raw_sent.get("sentiment", "neutral") if isinstance(raw_sent, dict) else "neutral"
        )

        report_data = pd.Series({
            "text": request.text,
            "has_location": False,
            "has_media": False,
            "word_count": len(request.text.split()),
            "is_hazard": result["hazard_detection"]["is_hazard"],
            "sentiment": sent_label,
            "has_urgency_words": False,
        })
        credibility = cred.score_report(report_data)
        processing_time = (time.time() - start_time) * 1000

        return TextAnalysisResponse(
            text=request.text,
            hazard_detection=result["hazard_detection"],
            sentiment=result.get("sentiment"),
            entities=result.get("entities"),
            credibility_score=float(credibility),
            processing_time_ms=processing_time,
        )
    except Exception as e:
        logger.error(f"Error in analyze_text: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  Batch Analysis
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/v1/analyze/batch", response_model=BatchTextResponse, tags=["Analysis"])
async def analyze_batch(request: BatchTextRequest):
    try:
        pred = _get_predictor()
        cred = _get_credibility_scorer()

        start_time = time.time()
        results = []

        for text in request.texts:
            result = pred.predict(
                text,
                include_sentiment=request.include_sentiment,
                include_entities=request.include_entities,
            )
            raw_sent = result.get("sentiment", "neutral")
            sent_label = raw_sent if isinstance(raw_sent, str) else (
                raw_sent.get("sentiment", "neutral") if isinstance(raw_sent, dict) else "neutral"
            )
            report_data = pd.Series({
                "text": text,
                "has_location": False,
                "has_media": False,
                "word_count": len(text.split()),
                "is_hazard": result["hazard_detection"]["is_hazard"],
                "sentiment": sent_label,
                "has_urgency_words": False,
            })
            credibility = cred.score_report(report_data)

            results.append(TextAnalysisResponse(
                text=text,
                hazard_detection=result["hazard_detection"],
                sentiment=result.get("sentiment"),
                entities=result.get("entities"),
                credibility_score=float(credibility),
                processing_time_ms=result["processing_time_ms"],
            ))

        processing_time = (time.time() - start_time) * 1000
        return BatchTextResponse(
            results=results,
            total_count=len(results),
            processing_time_ms=processing_time,
        )
    except Exception as e:
        logger.error(f"Error in analyze_batch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  Report Analysis  (backend calls this)
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/v1/analyze/report", response_model=ReportAnalysisResponse, tags=["Analysis"])
async def analyze_report(request: ReportAnalysisRequest):
    try:
        pred = _get_predictor()
        cred = _get_credibility_scorer()

        start_time = time.time()
        text_result = pred.predict(request.text)

        raw_sentiment = text_result.get("sentiment", {})
        if isinstance(raw_sentiment, str):
            sentiment_label = raw_sentiment
            panic_count = 0
        elif isinstance(raw_sentiment, dict):
            sentiment_label = raw_sentiment.get("sentiment", "neutral")
            panic_count = raw_sentiment.get("panic_word_count", 0)
        else:
            sentiment_label = "neutral"
            panic_count = 0

        report_data = pd.Series({
            "text": request.text,
            "has_location": True,
            "has_media": request.has_media,
            "media_count": request.media_count,
            "author_followers": request.author_followers,
            "word_count": len(request.text.split()),
            "is_hazard": text_result["hazard_detection"]["is_hazard"],
            "sentiment": sentiment_label,
            "has_urgency_words": panic_count > 0,
            "total_engagement": 0,
        })
        credibility = cred.score_report(report_data)
        processing_time = (time.time() - start_time) * 1000

        report_id = hashlib.md5(
            f"{request.text}{request.timestamp}".encode()
        ).hexdigest()[:16]

        resp_sentiment = (
            raw_sentiment if isinstance(raw_sentiment, dict)
            else {"sentiment": raw_sentiment}
        )
        raw_entities = text_result.get("entities", {})
        resp_entities = raw_entities if isinstance(raw_entities, dict) else {}

        response = ReportAnalysisResponse(
            report_id=f"RPT_{report_id}",
            hazard_detection=text_result["hazard_detection"],
            sentiment=resp_sentiment,
            entities=resp_entities,
            credibility_score=float(credibility),
            location={"latitude": request.latitude, "longitude": request.longitude},
            metadata={
                "has_media": request.has_media,
                "media_count": request.media_count,
                "author_followers": request.author_followers,
                "timestamp": request.timestamp.isoformat(),
                "processing_time_ms": processing_time,
            },
        )

        await manager.broadcast({
            "type": "new_report",
            "data": serialize_for_json(response.dict()),
        })
        return response
    except Exception as e:
        logger.error(f"Error in analyze_report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  Image Analysis (CLIP zero-shot)
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/v1/analyze/image", tags=["Analysis"])
async def analyze_image_only(image: UploadFile = File(...)):
    """Classify an uploaded image using CLIP zero-shot classification."""
    try:
        classifier = _get_image_classifier()
    except Exception as e:
        logger.error(f"Image classifier not available: {e}")
        raise HTTPException(
            status_code=503,
            detail="Image classification service is loading, try again shortly.",
        )

    temp_filename = f"/tmp/{uuid.uuid4()}_{image.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        result = classifier.classify_image(temp_filename)
        return serialize_for_json(result)
    except Exception as e:
        logger.error(f"Error in analyze_image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)


# ═══════════════════════════════════════════════════════════════════════════════
#  Multimodal Analysis (text + image + real data)
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/v1/analyze/multimodal", tags=["Analysis"])
async def analyze_multimodal(
    text: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    image: UploadFile = File(None),
):
    try:
        results = {}

        # 1) Text analysis
        text_request = TextAnalysisRequest(
            text=text, include_entities=True, include_sentiment=True
        )
        text_result = await analyze_text(text_request)
        results["text_analysis"] = serialize_for_json(text_result.dict())

        # 2) Image analysis (optional)
        image_result = None
        if image:
            try:
                classifier = _get_image_classifier()
                temp_filename = f"/tmp/{uuid.uuid4()}_{image.filename}"
                try:
                    with open(temp_filename, "wb") as buffer:
                        shutil.copyfileobj(image.file, buffer)
                    image_result = classifier.classify_image(temp_filename)
                    results["image_analysis"] = serialize_for_json(image_result)
                    consistency = classifier.verify_consistency(
                        image_path=temp_filename,
                        text_prediction=text_result.hazard_detection["hazard_type"],
                    )
                    results["consistency_check"] = serialize_for_json(consistency)
                finally:
                    if os.path.exists(temp_filename):
                        os.remove(temp_filename)
            except Exception as img_err:
                logger.warning(f"Image analysis skipped: {img_err}")
                results["image_analysis"] = None
                results["consistency_check"] = None
        else:
            results["image_analysis"] = None
            results["consistency_check"] = None

        # 3) Real-data verification (optional, never blocks)
        try:
            ocean = _get_ocean_client()
            verification = await ocean.verify_hazard_report(
                hazard_type=text_result.hazard_detection["hazard_type"],
                latitude=latitude,
                longitude=longitude,
            )
            results["real_data_verification"] = serialize_for_json(verification)
        except Exception as ver_err:
            logger.warning(f"Real-data verification skipped: {ver_err}")
            results["real_data_verification"] = {
                "verified": False,
                "confidence": 0.0,
                "explanation": "Verification service unavailable",
            }

        # 4) Final integrated prediction
        final = _integrate_predictions(text_result.dict(), image_result, results.get("real_data_verification", {}))
        results["final_prediction"] = serialize_for_json(final)
        return results

    except Exception as e:
        logger.error(f"Error in analyze_multimodal: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  Hotspot Detection
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/v1/hotspots/detect", response_model=HotspotDetectionResponse, tags=["Hotspots"])
async def detect_hotspots(request: HotspotDetectionRequest):
    try:
        hotspot_gen = _get_hotspot_generator()

        start_time = time.time()
        df = pd.DataFrame(request.reports)

        if "latitude" not in df.columns or "longitude" not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="Reports must include 'latitude' and 'longitude'",
            )

        hotspot_gen.min_reports = request.min_reports
        hotspot_gen.radius_km = request.radius_km
        hotspots = hotspot_gen.generate_hotspots(df)

        processing_time = (time.time() - start_time) * 1000
        hotspot_responses = [
            HotspotResponse(**serialize_for_json(hotspot)) for hotspot in hotspots
        ]

        response = HotspotDetectionResponse(
            hotspots=hotspot_responses,
            total_count=len(hotspot_responses),
            processing_time_ms=processing_time,
        )
        await manager.broadcast({
            "type": "hotspots_detected",
            "data": {
                "count": len(hotspot_responses),
                "hotspots": serialize_for_json([h.dict() for h in hotspot_responses]),
            },
        })
        return response
    except Exception as e:
        logger.error(f"Error in detect_hotspots: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
#  Verification against real ocean data
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/api/v1/verify/report", tags=["Verification"])
async def verify_report_only(hazard_type: str, latitude: float, longitude: float):
    try:
        ocean = _get_ocean_client()
        result = await ocean.verify_hazard_report(
            hazard_type=hazard_type,
            latitude=latitude,
            longitude=longitude,
        )
        return serialize_for_json(result)
    except Exception as e:
        logger.warning(f"Verification failed (non-critical): {e}")
        return {
            "verified": False,
            "confidence": 0.0,
            "explanation": f"Verification unavailable: {str(e)}",
            "hazard_type": hazard_type,
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  Model Info
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/api/v1/models/info", response_model=Dict[str, ModelInfoResponse], tags=["Models"])
async def get_model_info():
    pred = _get_predictor()
    return {
        "text_classifier": ModelInfoResponse(
            model_name="Keyword Hazard Classifier",
            model_type="rule_based",
            status="loaded",
            loaded=True,
            metadata={
                "num_labels": len(pred.id2label),
                "labels": list(pred.id2label.values()),
            },
        ),
        "sentiment_analyzer": ModelInfoResponse(
            model_name="VADER",
            model_type="rule_based",
            status="loaded",
            loaded=True,
            metadata={"type": "sentiment + panic detection"},
        ),
        "ner": ModelInfoResponse(
            model_name="spaCy en_core_web_sm",
            model_type="statistical",
            status="loaded",
            loaded=True,
            metadata={"entities": ["locations", "organizations", "dates", "times"]},
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket
# ═══════════════════════════════════════════════════════════════════════════════
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
    except Exception:
        manager.disconnect(websocket)


# ═══════════════════════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════════════════════
def _integrate_predictions(text_result: dict, image_result: dict | None, verification: dict) -> dict:
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
        "confidence": float(round(confidence, 4)),
        "verified_by_real_data": verification.get("verified", False),
        "has_visual_confirmation": image_result is not None,
        "credibility_score": text_result.get("credibility_score", 0.5),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  Startup / Shutdown
# ═══════════════════════════════════════════════════════════════════════════════
@app.on_event("startup")
async def startup_event():
    logger.info("=" * 60)
    logger.info("  Starting Tat-Sahayk ML Service")
    logger.info("=" * 60)

    # Pre-load lightweight services (text predictor, credibility scorer)
    try:
        _get_predictor()
        logger.info("✅ Text Predictor ready")
    except Exception as e:
        logger.warning(f"⚠️  Text Predictor deferred: {e}")

    try:
        _get_credibility_scorer()
        logger.info("✅ Credibility Scorer ready")
    except Exception as e:
        logger.warning(f"⚠️  Credibility Scorer deferred: {e}")

    # Image classifier and ocean client are loaded lazily on first request
    logger.info("ℹ️  Image Classifier will load on first image request")
    logger.info("ℹ️  Ocean Data Client will load on first verification request")
    logger.info("=" * 60)
    logger.info("✅ ML Service is READY")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Tat-Sahayk ML Service")
