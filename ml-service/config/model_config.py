from typing import Dict, List

class ModelConfig:
    """ML Model configurations"""
    

    HAZARD_TYPES = [
        "tsunami",
        "storm_surge",
        "high_waves",
        "coastal_erosion",
        "flooding",
        "cyclone",
        "other"
    ]
    

    SEVERITY_LEVELS = ["low", "medium", "high", "critical"]
    

    TEXT_CLASSIFIER_CONFIG = {
        "model_name": "bert-base-uncased",
        "num_labels": len(HAZARD_TYPES),
        "max_length": 512,
        "dropout": 0.1,
    }
    

    IMAGE_CLASSIFIER_CONFIG = {
        "model_name": "efficientnet-b0",
        "num_classes": len(HAZARD_TYPES),
        "image_size": 224,
        "pretrained": True,
    }
    

    SENTIMENT_CONFIG = {
        "model_name": "cardiffnlp/twitter-roberta-base-sentiment",
        "labels": ["negative", "neutral", "positive"],
    }
    

    NER_CONFIG = {
        "model_name": "dslim/bert-base-NER",
        "entity_types": ["LOC", "DATE", "EVENT", "ORG"],
    }
    

    HAZARD_KEYWORDS = {
        "tsunami": ["tsunami", "tidal wave", "seismic wave"],
        "storm_surge": ["storm surge", "sea level rise", "flooding"],
        "high_waves": ["high waves", "rough sea", "dangerous waves"],
        "coastal_erosion": ["erosion", "beach loss", "coastline"],
        "cyclone": ["cyclone", "hurricane", "typhoon", "storm"],
    }


model_config = ModelConfig()