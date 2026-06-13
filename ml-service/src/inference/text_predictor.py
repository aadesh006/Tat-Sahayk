"""
Keyword-based Coastal Hazard Text Classifier
Uses pattern matching for reliable hazard type detection.
Paired with VADER sentiment analysis and spaCy NER.
"""
import re
from typing import List, Dict, Optional
import time
import logging

logger = logging.getLogger(__name__)

# ─── Hazard keyword patterns ────────────────────────────────────────────────
HAZARD_PATTERNS = {
    "tsunami": {
        "keywords": [
            "tsunami", "tidal wave", "seismic sea wave", "seismic wave",
            "harbor wave", "massive wave", "giant wave hitting",
            "ocean surge", "wall of water"
        ],
        "weight": 1.0,
    },
    "cyclone": {
        "keywords": [
            "cyclone", "hurricane", "typhoon", "tropical storm",
            "cyclonic storm", "super cyclone", "tropical depression",
            "eye of the storm", "cyclonic circulation"
        ],
        "weight": 1.0,
    },
    "storm_surge": {
        "keywords": [
            "storm surge", "surge flooding", "sea water rising",
            "coastal surge", "water surge", "tidal surge",
            "surge wave", "abnormal rise", "sea level surge"
        ],
        "weight": 0.95,
    },
    "high_waves": {
        "keywords": [
            "high waves", "rough sea", "heavy waves", "large waves",
            "big waves", "dangerous waves", "rough waters", "violent waves",
            "turbulent sea", "wave warning", "swell warning", "heavy swell",
            "rogue wave", "towering waves", "choppy sea"
        ],
        "weight": 0.9,
    },
    "coastal_erosion": {
        "keywords": [
            "erosion", "eroding", "coastline damage", "beach erosion",
            "land loss", "shore erosion", "cliff collapse", "shoreline retreating",
            "land sliding into sea", "coastal degradation", "beach washed away",
            "sand loss", "embankment collapse"
        ],
        "weight": 0.85,
    },
    "coastal_flooding": {
        "keywords": [
            "coastal flooding", "flood", "inundation", "submerged",
            "waterlogged", "water entering", "streets flooded",
            "houses under water", "water level rising", "sea water entering",
            "low lying areas flooded", "tidal flooding", "flash flood"
        ],
        "weight": 0.9,
    },
}

# General emergency indicators (boost confidence)
EMERGENCY_INDICATORS = [
    "danger", "emergency", "warning", "alert", "evacuate", "rescue",
    "help", "sos", "urgent", "critical", "severe", "devastating",
    "destructive", "catastrophic", "deadly", "life-threatening",
    "mayday", "distress", "immediate", "hazard", "threat"
]


class TextPredictor:
    """
    Keyword-based hazard text classifier with sentiment & NER.
    Uses pattern matching for reliable hazard type detection —
    no heavy transformer model download required.
    """

    DEFAULT_LABELS = {
        0: "none",
        1: "tsunami",
        2: "storm_surge",
        3: "high_waves",
        4: "cyclone",
        5: "coastal_erosion",
        6: "coastal_flooding",
    }

    def __init__(self):
        logger.info("🔧 Initializing Text Predictor (keyword-based)...")

        # Compile regex patterns for each hazard type
        self.hazard_patterns = {}
        for hazard_type, config in HAZARD_PATTERNS.items():
            patterns = [re.escape(kw) for kw in config["keywords"]]
            self.hazard_patterns[hazard_type] = {
                "regex": re.compile("|".join(patterns), re.IGNORECASE),
                "weight": config["weight"],
            }

        self.emergency_regex = re.compile(
            "|".join(re.escape(w) for w in EMERGENCY_INDICATORS), re.IGNORECASE
        )

        self.id2label = self.DEFAULT_LABELS.copy()
        self.label2id = {v: k for k, v in self.id2label.items()}

        # ── Load sentiment analyzer ──────────────────────────────────────
        logger.info("🔧 Loading sentiment analyzer...")
        try:
            from src.models.sentiment_model import SentimentAnalyzer
            self.sentiment_analyzer = SentimentAnalyzer()
            logger.info("✅ Sentiment analyzer loaded")
        except Exception as e:
            logger.warning(f"⚠️  Sentiment analyzer failed to load: {e}")
            self.sentiment_analyzer = None

        # ── Load NER model ───────────────────────────────────────────────
        logger.info("🔧 Loading NER model...")
        try:
            from src.models.ner_model import NamedEntityRecognizer
            self.ner = NamedEntityRecognizer()
            logger.info("✅ NER model loaded")
        except Exception as e:
            logger.warning(f"⚠️  NER model failed to load: {e}")
            self.ner = None

        logger.info("✅ Text Predictor initialized successfully!")

    # ─── Hazard detection ────────────────────────────────────────────────
    def predict_hazard(self, text: str) -> Dict:
        """Detect hazard type from text using keyword matching."""
        start_time = time.time()
        text_lower = text.lower()

        # Score each hazard type
        scores = {}
        for hazard_type, config in self.hazard_patterns.items():
            matches = config["regex"].findall(text_lower)
            if matches:
                match_score = min(len(matches) * 0.25 + 0.45, 0.95)
                scores[hazard_type] = match_score * config["weight"]
            else:
                scores[hazard_type] = 0.0

        # Check for emergency indicators (boosts overall confidence)
        emergency_matches = self.emergency_regex.findall(text_lower)
        emergency_boost = min(len(emergency_matches) * 0.05, 0.15)

        # Determine the best match
        if any(s > 0 for s in scores.values()):
            best_type = max(scores, key=scores.get)
            confidence = min(scores[best_type] + emergency_boost, 0.95)
            is_hazard = True
        else:
            best_type = "none"
            confidence = 0.85 if not emergency_matches else 0.45
            is_hazard = len(emergency_matches) > 0

        # Build probabilities dict
        total = sum(scores.values()) or 1.0
        probabilities = {"none": 0.0}
        for ht, score in scores.items():
            probabilities[ht] = round(score / total, 4) if total > 0 else 0.0
        if best_type == "none":
            probabilities["none"] = confidence

        processing_time = (time.time() - start_time) * 1000

        return {
            "is_hazard": is_hazard,
            "hazard_type": best_type,
            "confidence": round(float(confidence), 4),
            "probabilities": probabilities,
            "processing_time_ms": round(processing_time, 2),
        }

    # ─── Full prediction ─────────────────────────────────────────────────
    def predict(
        self,
        text: str,
        include_sentiment: bool = True,
        include_entities: bool = True,
    ) -> Dict:
        """Full prediction: hazard detection + sentiment + entities."""
        start_time = time.time()

        result = {
            "text": text,
            "hazard_detection": self.predict_hazard(text),
        }

        # Sentiment
        if include_sentiment and self.sentiment_analyzer:
            try:
                sentiment_result = self.sentiment_analyzer.analyze_text(text)
                result["sentiment"] = sentiment_result.get("sentiment", "neutral")
            except Exception as e:
                logger.error(f"Sentiment error: {e}")
                result["sentiment"] = "neutral"
        else:
            result["sentiment"] = "neutral"

        # Named entities
        if include_entities and self.ner:
            try:
                result["entities"] = self.ner.extract_entities(text)
            except Exception as e:
                logger.error(f"NER error: {e}")
                result["entities"] = {"locations": [], "error": str(e)}
        else:
            result["entities"] = {"locations": []}

        result["processing_time_ms"] = round((time.time() - start_time) * 1000, 2)
        return result

    def predict_batch(self, texts: List[str], **kwargs) -> List[Dict]:
        return [self.predict(text, **kwargs) for text in texts]

    def analyze_complete(self, text: str, **kwargs) -> Dict:
        return self.predict(text, **kwargs)


# ─── Singleton ───────────────────────────────────────────────────────────────
_predictor = None


def get_predictor():
    global _predictor
    if _predictor is None:
        _predictor = TextPredictor()
    return _predictor
