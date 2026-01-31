from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class Entity(BaseModel):
    text: str
    label: str
    start: int
    end: int
    confidence: Optional[float] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str

class TextAnalysisResponse(BaseModel):
    text: str
    hazard_detection: Dict[str, Any]
    sentiment: Optional[Dict[str, Any]] = None
    entities: Optional[Dict[str, Any]] = None
    credibility_score: Optional[float] = None
    processing_time_ms: float

class BatchTextResponse(BaseModel):
    results: List[TextAnalysisResponse]
    total_count: int
    processing_time_ms: float

class ReportAnalysisResponse(BaseModel):
    report_id: str
    hazard_detection: Dict[str, Any]
    sentiment: Dict[str, Any]
    entities: Dict[str, Any]
    credibility_score: float
    location: Dict[str, float]
    metadata: Dict[str, Any]

class HotspotResponse(BaseModel):
    hotspot_id: str
    latitude: float
    longitude: float
    radius_km: float
    hazard_type: str
    severity: str
    threat_level: float
    report_count: int
    active: bool

class HotspotDetectionResponse(BaseModel):
    hotspots: List[HotspotResponse]
    total_count: int
    processing_time_ms: float

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ModelInfoResponse(BaseModel):
    model_name: str
    model_type: str
    status: str
    loaded: bool
    metadata: Optional[Dict[str, Any]] = None