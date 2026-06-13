from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from datetime import datetime

class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to analyze")
    include_entities: bool = Field(True, description="Include named entity extraction")
    include_sentiment: bool = Field(True, description="Include sentiment analysis")
    
    @validator('text')
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Text cannot be empty or only whitespace')
        return v

class BatchTextRequest(BaseModel):
    texts: List[str] = Field(..., min_items=1, max_items=100)
    include_entities: bool = True
    include_sentiment: bool = True
    
    @validator('texts')
    def validate_texts(cls, v):
        if not all(text.strip() for text in v):
            raise ValueError('All texts must be non-empty')
        return v

class ReportAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    has_media: bool = False
    media_count: Optional[int] = Field(0, ge=0, le=10)
    author_followers: Optional[int] = Field(0, ge=0)
    timestamp: Optional[datetime] = None
    
    @validator('timestamp', pre=True, always=True)
    def set_timestamp(cls, v):
        return v or datetime.now()

class HotspotDetectionRequest(BaseModel):
    reports: List[Dict] = Field(..., min_items=1)
    min_reports: int = Field(3, ge=2, le=10)
    radius_km: float = Field(5.0, ge=1.0, le=50.0)
    
    class Config:
        schema_extra = {
            "example": {
                "reports": [
                    {
                        "latitude": 19.0760,
                        "longitude": 72.8777,
                        "hazard_type": "tsunami",
                        "timestamp": "2025-01-30T10:00:00"
                    }
                ],
                "min_reports": 3,
                "radius_km": 5.0
            }
        }

class NearbyReportsRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(10.0, ge=1.0, le=100.0)
    hazard_type: Optional[str] = None
    min_credibility: Optional[float] = Field(None, ge=0.0, le=1.0)

class CredibilityScoreRequest(BaseModel):
    text: str
    has_location: bool = False
    has_media: bool = False
    media_count: int = 0
    author_followers: int = 0
    total_engagement: int = 0
    is_verified: bool = False