import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import numpy as np
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class ImageHazardClassifier:
    """
    Classifies ocean hazard images using CLIP zero-shot learning
    
    Categories:
    - tsunami
    - high_waves
    - storm_surge
    - coastal_flooding
    - coastal_erosion
    - cyclone
    - normal (no hazard)
    """
    
    def __init__(self):
        """Initialize CLIP model for zero-shot classification"""
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f" Using device: {self.device}")
        
        logger.info(" Loading CLIP model...")
        self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        self.model.to(self.device)
        logger.info(" CLIP model loaded successfully")
        
        self.categories = [
            "a photo of a tsunami with massive ocean waves flooding the coast",
            "a photo of high ocean waves during a severe storm",
            "a photo of coastal storm surge flooding buildings",
            "a photo of coastal flooding with water covering streets",
            "a photo of coastal erosion with damaged shoreline",
            "a photo of a tropical cyclone with dark clouds and heavy rain",
            "a photo of calm ocean water with normal conditions"
        ]
        
        self.category_labels = [
            "tsunami",
            "high_waves", 
            "storm_surge",
            "coastal_flooding",
            "coastal_erosion",
            "cyclone",
            "normal"
        ]
    
    def classify_image(self, image_path: str) -> Dict:
        try:
            logger.info(f" Classifying image: {image_path}")
            image = Image.open(image_path).convert("RGB")
            inputs = self.processor(
                text=self.categories,
                images=image,
                return_tensors="pt",
                padding=True
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits_per_image = outputs.logits_per_image
                probs = logits_per_image.softmax(dim=1).cpu().numpy()[0]
            top_idx = np.argmax(probs)
            top_prob = float(probs[top_idx])
            hazard_type = self.category_labels[top_idx]
            severity = self._calculate_severity(hazard_type, top_prob)
            all_scores = {
                label: float(prob) 
                for label, prob in zip(self.category_labels, probs)
            }
            
            logger.info(
                f"Classification: {hazard_type} "
                f"(confidence: {top_prob:.2%}, severity: {severity})"
            )
            
            return {
                "hazard_type": hazard_type,
                "confidence": top_prob,
                "all_scores": all_scores,
                "severity": severity,
                "is_hazard": hazard_type != "normal",
                "model": "clip-vit-base-patch32"
            }
            
        except Exception as e:
            logger.error(f" Error classifying image: {str(e)}")
            return {
                "hazard_type": "unknown",
                "confidence": 0.0,
                "error": str(e),
                "is_hazard": False
            }
    
    def verify_consistency(self, image_path: str, text_prediction: str) -> Dict:
        """
        Check if image matches text prediction
        
        Args:
            image_path: Path to image
            text_prediction: Hazard type from text analysis
            
        Returns:
            {
                "consistent": True/False,
                "consistency_score": 0.8,
                "image_prediction": "tsunami",
                "text_prediction": "tsunami"
            }
        """
        image_result = self.classify_image(image_path)
        
        # Check if predictions match
        consistent = (
            image_result["hazard_type"] == text_prediction or
            image_result["all_scores"].get(text_prediction, 0) > 0.3
        )
        
        consistency_score = image_result["all_scores"].get(text_prediction, 0.0)
        
        return {
            "consistent": consistent,
            "consistency_score": float(consistency_score),
            "image_prediction": image_result["hazard_type"],
            "text_prediction": text_prediction,
            "explanation": (
                f"Image shows '{image_result['hazard_type']}' "
                f"({'matches' if consistent else 'differs from'}) "
                f"text description of '{text_prediction}'"
            )
        }
    
    def _calculate_severity(self, hazard_type: str, confidence: float) -> str:
        if hazard_type == "normal":
            return "none"
        if confidence >= 0.8:
            return "high"
        elif confidence >= 0.6:
            return "medium"
        elif confidence >= 0.4:
            return "low"
        else:
            return "very_low"