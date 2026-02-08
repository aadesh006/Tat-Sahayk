import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List, Dict, Optional
import time
import logging
from pathlib import Path
import json
import os

logger = logging.getLogger(__name__)

class TextPredictor:
    DEFAULT_LABELS = {
        0: "none",
        1: "tsunami",
        2: "storm_surge",
        3: "high_waves",
        4: "cyclone",
        5: "coastal_erosion"
    }
    
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            local_model_path = Path(__file__).parent.parent.parent / "models" / "text_classifier"
            
            if local_model_path.exists() and (local_model_path / "config.json").exists():
                model_path = str(local_model_path)
                logger.info(f" Using local model: {model_path}")
                self.is_local_model = True
            else:
                model_path = "distilbert-base-uncased"
                logger.info(f"☁️  Using Hugging Face model: {model_path}")
                self.is_local_model = False
        else:
            self.is_local_model = os.path.exists(str(model_path))
        
        logger.info(f" Loading text classifier from {model_path}")
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
            self.model.eval()
            if self.is_local_model:
                metadata_path = Path(model_path) / 'metadata.json'
                if metadata_path.exists():
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                    self.label2id = metadata['label2id']
                    self.id2label = {int(k): v for k, v in metadata['id2label'].items()}
                    self.max_length = metadata.get('max_length', 128)
                    logger.info(" Loaded metadata from local model")
                else:
                    logger.warning("  Local model has no metadata, using defaults")
                    self._use_default_labels()
            else:
                logger.info(" Using default hazard labels for HF model")
                self._use_default_labels()
            
            logger.info(f" Text classifier loaded successfully")
            logger.info(f"   Labels: {list(self.id2label.values())}")
            
        except Exception as e:
            logger.error(f" Failed to load text classifier: {e}")
            raise

        logger.info(" Loading sentiment analyzer")
        try:
            from src.models.sentiment_model import SentimentAnalyzer
            self.sentiment_analyzer = SentimentAnalyzer()
            logger.info(" Sentiment analyzer loaded")
        except Exception as e:
            logger.error(f" Failed to load sentiment analyzer: {e}")
            raise

        logger.info(" Loading NER model...")
        try:
            from src.models.ner_model import NamedEntityRecognizer
            self.ner = NamedEntityRecognizer()
            logger.info(" NER model loaded")
        except Exception as e:
            logger.error(f" Failed to load NER model: {e}")
            raise
        
        logger.info(" All models loaded successfully!")
    
    def _use_default_labels(self):
        self.id2label = self.DEFAULT_LABELS.copy()
        self.label2id = {v: k for k, v in self.id2label.items()}
        self.max_length = 128
    
    def predict_hazard(self, text: str) -> Dict:
        start_time = time.time()
        
        try:
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
            
            num_labels = probabilities.shape[1]
            if num_labels != len(self.id2label):
                logger.warning(f" Model has {num_labels} labels but metadata has {len(self.id2label)}")
                predicted_label_id = min(predicted_label_id, len(self.id2label) - 1)
            
            result = {
                'is_hazard': predicted_label_id != 0,
                'hazard_type': self.id2label.get(predicted_label_id, 'unknown'),
                'confidence': float(confidence),
                'probabilities': {
                    self.id2label.get(i, f'label_{i}'): float(probabilities[0][i])
                    for i in range(min(num_labels, len(self.id2label)))
                }
            }
            
        except Exception as e:
            logger.error(f" Error in hazard prediction: {e}")
            result = {
                'is_hazard': False,
                'hazard_type': 'unknown',
                'confidence': 0.0,
                'probabilities': {label: 0.0 for label in self.id2label.values()},
                'error': str(e)
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
            try:
                result['sentiment'] = self.sentiment_analyzer.analyze_text(text)
            except Exception as e:
                logger.error(f" Sentiment analysis error: {e}")
                result['sentiment'] = {
                    'sentiment': 'neutral',
                    'error': str(e)
                }
        if include_entities:
            try:
                result['entities'] = self.ner.extract_entities(text)
            except Exception as e:
                logger.error(f" NER error: {e}")
                result['entities'] = {
                    'locations': [],
                    'error': str(e)
                }
        
        processing_time = (time.time() - start_time) * 1000
        result['processing_time_ms'] = processing_time
        
        return result
    
    def predict_batch(
        self,
        texts: List[str],
        **kwargs
    ) -> List[Dict]:
        return [self.predict(text, **kwargs) for text in texts]
    
    def analyze_complete(
        self,
        text: str,
        include_sentiment: bool = True,
        include_entities: bool = True
    ) -> Dict:
        return self.predict(text, include_sentiment, include_entities)

_predictor = None


def get_predictor() -> TextPredictor:
    global _predictor
    
    if _predictor is None:
        logger.info(" Initializing TextPredictor singleton")
        _predictor = TextPredictor()
    
    return _predictor


def reset_predictor():
    global _predictor
    _predictor = None