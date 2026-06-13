import pandas as pd
import numpy as np
from typing import List, Dict, Optional
from nltk.sentiment import SentimentIntensityAnalyzer
import nltk
import logging
from pathlib import Path
import json
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))
from src.models.base_model import BaseModel

logger = logging.getLogger(__name__)

try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    logger.info("Downloading VADER lexicon...")
    nltk.download('vader_lexicon', quiet=True)

class SentimentAnalyzer(BaseModel):
    """
    Uses VADER (Valence Aware Dictionary and sEntiment Reasoner)
    """
    
    def __init__(self):
        super().__init__("VADER Sentiment Analyzer")
        self.sia = SentimentIntensityAnalyzer()
        self.panic_keywords = {
            'critical': {
                'words': [
                    'emergency', 'urgent', 'evacuate', 'sos', 'help',
                    'critical', 'disaster', 'immediate', 'now', 'asap',
                    'life-threatening', 'deadly', 'fatal', 'catastrophic'
                ],
                'weight': 4.0
            },
            'high': {
                'words': [
                    'warning', 'alert', 'danger', 'severe', 'serious',
                    'major', 'significant', 'important', 'threatening',
                    'hazardous', 'dangerous', 'extreme'
                ],
                'weight': 3.0
            },
            'medium': {
                'words': [
                    'concern', 'watch', 'caution', 'advisory', 'moderate',
                    'attention', 'notice', 'careful', 'aware'
                ],
                'weight': 2.0
            },
            'low': {
                'words': [
                    'update', 'information', 'minor', 'slight', 'possible',
                    'potential', 'developing'
                ],
                'weight': 1.0
            }
        }
        
        self.urgency_patterns = {
            'all_caps': 1.5,  
            'multiple_exclamations': 1.3,  
            'question_urgency': 0.8  
        }
        
        self.is_trained = True  
        logger.info("SentimentAnalyzer initialized with VADER")
    
    def analyze_text(self, text: str) -> Dict:
        if not isinstance(text, str) or not text.strip():
            return self._empty_result()
        
        text_lower = text.lower()
        
        vader_scores = self.sia.polarity_scores(text)
        
        panic_score = 0.0
        panic_word_count = 0
        panic_level_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        
        for level, data in self.panic_keywords.items():
            count = sum(1 for word in data['words'] if word in text_lower)
            panic_level_counts[level] = count
            panic_word_count += count
            panic_score += count * data['weight']
        all_caps_count = sum(1 for word in text.split() if word.isupper() and len(word) > 1)
        if all_caps_count > 0:
            panic_score *= (1 + all_caps_count * 0.1)
        
        exclamation_groups = text.count('!!') + text.count('!!!')
        if exclamation_groups > 0:
            panic_score *= self.urgency_patterns['multiple_exclamations']
        
        if panic_score >= 12:
            panic_level = 'critical'
        elif panic_score >= 6:
            panic_level = 'high'
        elif panic_score >= 2:
            panic_level = 'medium'
        else:
            panic_level = 'low'
        
        compound = vader_scores['compound']
        if compound >= 0.05:
            sentiment = 'positive'
        elif compound <= -0.05:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        urgency = (vader_scores['neg'] * 2) + (panic_score / 10)
        urgency = min(urgency, 1.0)  
        
        return {
            'sentiment': sentiment,
            'sentiment_scores': vader_scores,
            'panic_level': panic_level,
            'panic_score': panic_score,
            'panic_word_count': panic_word_count,
            'panic_level_counts': panic_level_counts,
            'urgency': urgency,
            'all_caps_count': all_caps_count,
            'exclamation_count': text.count('!')
        }
    
    def _empty_result(self) -> Dict:
        """Return empty/default result"""
        return {
            'sentiment': 'neutral',
            'sentiment_scores': {'compound': 0, 'pos': 0, 'neu': 1, 'neg': 0},
            'panic_level': 'low',
            'panic_score': 0,
            'panic_word_count': 0,
            'panic_level_counts': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0},
            'urgency': 0,
            'all_caps_count': 0,
            'exclamation_count': 0
        }
    
    def batch_analyze(self, texts: List[str]) -> List[Dict]:
        return [self.analyze_text(text) for text in texts]
    
    def add_sentiment_features(
        self,
        df: pd.DataFrame,
        text_column: str = 'text'
    ) -> pd.DataFrame:
        logger.info(f"Analyzing sentiment for {len(df)} texts...")
        
        df = df.copy()
        
        results = self.batch_analyze(df[text_column].tolist())
        
        df['sentiment'] = [r['sentiment'] for r in results]
        df['sentiment_compound'] = [r['sentiment_scores']['compound'] for r in results]
        df['sentiment_positive'] = [r['sentiment_scores']['pos'] for r in results]
        df['sentiment_negative'] = [r['sentiment_scores']['neg'] for r in results]
        df['sentiment_neutral'] = [r['sentiment_scores']['neu'] for r in results]
        df['predicted_panic_level'] = [r['panic_level'] for r in results]
        df['panic_score'] = [r['panic_score'] for r in results]
        df['panic_word_count'] = [r['panic_word_count'] for r in results]
        df['urgency_score'] = [r['urgency'] for r in results]
        
        logger.info(" Sentiment analysis complete")
        return df
    
    def train(self, train_data=None, val_data=None, **kwargs):
        logger.info("VADER is rule-based and doesn't require training")
        return {'status': 'no training required'}
    
    def predict(self, input_data):
        if isinstance(input_data, str):
            return self.analyze_text(input_data)
        elif isinstance(input_data, list):
            return self.batch_analyze(input_data)
        else:
            raise ValueError("Input must be string or list of strings")
    
    def save(self, path: Path):
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        
        metadata = {
            'model_name': self.model_name,
            'panic_keywords': self.panic_keywords,
            'urgency_patterns': self.urgency_patterns,
            'is_trained': self.is_trained
        }
        
        with open(path / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model configuration saved to {path}")
    
    def load(self, path: Path):
        """Load model configuration"""
        path = Path(path)
        
        with open(path / 'metadata.json', 'r') as f:
            metadata = json.load(f)
        
        self.panic_keywords = metadata.get('panic_keywords', self.panic_keywords)
        self.urgency_patterns = metadata.get('urgency_patterns', self.urgency_patterns)
        
        logger.info(f"Model configuration loaded from {path}")


if __name__ == "__main__":
    analyzer = SentimentAnalyzer()
    
    # Test texts
    test_texts = [
        "EMERGENCY! TSUNAMI WARNING! EVACUATE IMMEDIATELY! LIFE THREATENING SITUATION!!!",
        "Beautiful calm day at the beach. Perfect weather for swimming.",
        "Storm surge warning issued for coastal areas. Residents advised to stay alert.",
        "Is anyone else seeing high waves? Should we be concerned? What to do?"
    ]
    
    print("SENTIMENT ANALYSIS EXAMPLES")
    
    for i, text in enumerate(test_texts, 1):
        print(f"Text {i}: {text}")
        
        result = analyzer.analyze_text(text)
        
        print(f"Sentiment: {result['sentiment']}")
        print(f"Compound Score: {result['sentiment_scores']['compound']:.3f}")
        print(f"Panic Level: {result['panic_level']}")
        print(f"Panic Score: {result['panic_score']:.2f}")
        print(f"Urgency: {result['urgency']:.3f}")
        print(f"Panic Keywords: {result['panic_word_count']}")
        print(f"  Critical: {result['panic_level_counts']['critical']}")
        print(f"  High: {result['panic_level_counts']['high']}")
        print(f"  Medium: {result['panic_level_counts']['medium']}")
        print(f"  Low: {result['panic_level_counts']['low']}")