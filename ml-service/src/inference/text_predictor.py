import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict, Optional
import time
import logging
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))
from config.settings import settings
from src.models.sentiment_model import SentimentAnalyzer
from src.models.ner_model import NamedEntityRecognizer

logger = logging.getLogger(__name__)

class TextPredictor:
    
    def __init__(self, model_path: Optional[Path] = None):
        if model_path is None:
            model_path = settings.MODELS_DIR / 'text_classifier'
        
        logger.info(f"Loading text classifier from {model_path}")
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
            self.model.eval()
            import json
            with open(model_path / 'metadata.json', 'r') as f:
                metadata = json.load(f)
            
            self.label2id = metadata['label2id']
            self.id2label = {int(k): v for k, v in metadata['id2label'].items()}
            self.max_length = metadata['max_length']
            
            logger.info(" Text classifier loaded")
            
        except Exception as e:
            logger.error(f"Failed to load text classifier: {e}")
            raise
        logger.info("Loading sentiment analyzer...")
        self.sentiment_analyzer = SentimentAnalyzer()
        logger.info("✓ Sentiment analyzer loaded")
        
        logger.info("Loading NER model...")
        self.ner = NamedEntityRecognizer()
        logger.info("✓NER model loaded")
        
        logger.info("All models loaded successfully!")
    
    def predict_hazard(self, text: str) -> Dict:
        start_time = time.time()
        inputs = self.tokenizer(
            text,
            return_tensors='pt',
            truncation=True,
            padding=True,
            max_length=self.max_length
        )
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
        predicted_label_id = probabilities.argmax().item()
        confidence = probabilities[0][predicted_label_id].item()
        result = {
            'is_hazard': predicted_label_id != 0,
            'hazard_type': self.id2label[predicted_label_id],
            'confidence': float(confidence),
            'probabilities': {
                self.id2label[i]: float(probabilities[0][i])
                for i in range(len(self.id2label))
            }
        }
        
        processing_time = (time.time() - start_time) * 1000
        result['processing_time_ms'] = processing_time
        
        return result
    
    def predict(
        self,
        text: str,
        include_sentiment: bool = True,
        include_entities: bool = True
    ) -> Dict:
        start_time = time.time()
        
        result = {
            'text': text,
            'hazard_detection': self.predict_hazard(text)
        }
        
        if include_sentiment:
            result['sentiment'] = self.sentiment_analyzer.analyze_text(text)
        
        if include_entities:
            result['entities'] = self.ner.extract_entities(text)
        
        processing_time = (time.time() - start_time) * 1000
        result['processing_time_ms'] = processing_time
        
        return result
    
    def predict_batch(
        self,
        texts: List[str],
        **kwargs
    ) -> List[Dict]:
        return [self.predict(text, **kwargs) for text in texts]

_predictor = None

def get_predictor() -> TextPredictor:
    global _predictor
    if _predictor is None:
        _predictor = TextPredictor()
    return _predictor