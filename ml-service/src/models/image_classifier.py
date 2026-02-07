from pydantic import BaseModel, Field
from typing import Optional, Dict, List

class ImageAnalysisResponse(BaseModel):
    hazard_type: str
    confidence: float
    all_scores: Dict[str, float]
    is_hazard: bool
    severity: Optional[str] = None

class MultimodalAnalysisResponse(BaseModel):
    text_analysis: Dict
    image_analysis: Optional[ImageAnalysisResponse] = None
    consistency_check: Optional[Dict] = None
    incois_verification: Optional[Dict] = None
    final_prediction: Dict