import spacy
from typing import List, Dict, Optional
import pandas as pd
import logging
from pathlib import Path
import json
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))
from src.models.base_model import BaseModel

logger = logging.getLogger(__name__)

class NamedEntityRecognizer(BaseModel):
    
    def __init__(self, model_name: str = 'en_core_web_sm'):
        super().__init__(model_name)
        try:
            self.nlp = spacy.load(model_name)
            logger.info(f"Loaded spaCy model: {model_name}")
        except OSError:
            logger.warning(f"Model {model_name} not found. Downloading...")
            import os
            os.system(f'python -m spacy download {model_name}')
            self.nlp = spacy.load(model_name)
        
        self.entity_categories = {
            'locations': ['GPE', 'LOC', 'FAC'],  
            'organizations': ['ORG'],  
            'persons': ['PERSON'],  
            'dates': ['DATE'],  
            'times': ['TIME'],  
            'events': ['EVENT'],  
            'quantities': ['QUANTITY', 'CARDINAL']  
        }
        
        self.is_trained = True  # Pre-trained model
        logger.info("NamedEntityRecognizer initialized")
    
    def extract_entities(self, text: str) -> Dict[str, List]:
        if not isinstance(text, str) or not text.strip():
            return self._empty_result()
        
        doc = self.nlp(text)
        
        entities = {
            'locations': [],
            'organizations': [],
            'persons': [],
            'dates': [],
            'times': [],
            'events': [],
            'quantities': [],
            'all_entities': []
        }
        
        for ent in doc.ents:
            entity_info = {
                'text': ent.text,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char
            }
            
            entities['all_entities'].append(entity_info)
            
            if ent.label_ in self.entity_categories['locations']:
                entities['locations'].append(ent.text)
            elif ent.label_ in self.entity_categories['organizations']:
                entities['organizations'].append(ent.text)
            elif ent.label_ in self.entity_categories['persons']:
                entities['persons'].append(ent.text)
            elif ent.label_ in self.entity_categories['dates']:
                entities['dates'].append(ent.text)
            elif ent.label_ in self.entity_categories['times']:
                entities['times'].append(ent.text)
            elif ent.label_ in self.entity_categories['events']:
                entities['events'].append(ent.text)
            elif ent.label_ in self.entity_categories['quantities']:
                entities['quantities'].append(ent.text)
        
        for category in entities:
            if category != 'all_entities':
                seen = set()
                unique = []
                for item in entities[category]:
                    if item not in seen:
                        seen.add(item)
                        unique.append(item)
                entities[category] = unique
        
        return entities
    
    def _empty_result(self) -> Dict:
        """Return empty result structure"""
        return {
            'locations': [],
            'organizations': [],
            'persons': [],
            'dates': [],
            'times': [],
            'events': [],
            'quantities': [],
            'all_entities': []
        }
    
    def batch_extract(self, texts: List[str]) -> List[Dict]:
        docs = list(self.nlp.pipe(texts))
        
        results = []
        for text, doc in zip(texts, docs):
            entities = self._extract_from_doc(doc)
            results.append(entities)
        
        return results
    
    def _extract_from_doc(self, doc) -> Dict:
        entities = {
            'locations': [],
            'organizations': [],
            'persons': [],
            'dates': [],
            'times': [],
            'events': [],
            'quantities': [],
            'all_entities': []
        }
        
        for ent in doc.ents:
            entity_info = {
                'text': ent.text,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char
            }
            
            entities['all_entities'].append(entity_info)
            
            if ent.label_ in self.entity_categories['locations']:
                entities['locations'].append(ent.text)
            elif ent.label_ in self.entity_categories['organizations']:
                entities['organizations'].append(ent.text)
            elif ent.label_ in self.entity_categories['persons']:
                entities['persons'].append(ent.text)
            elif ent.label_ in self.entity_categories['dates']:
                entities['dates'].append(ent.text)
            elif ent.label_ in self.entity_categories['times']:
                entities['times'].append(ent.text)
            elif ent.label_ in self.entity_categories['events']:
                entities['events'].append(ent.text)
            elif ent.label_ in self.entity_categories['quantities']:
                entities['quantities'].append(ent.text)
        
        for category in entities:
            if category != 'all_entities':
                entities[category] = list(dict.fromkeys(entities[category]))
        
        return entities
    
    def add_entity_features(
        self,
        df: pd.DataFrame,
        text_column: str = 'text'
    ) -> pd.DataFrame:
        logger.info(f"Extracting entities for {len(df)} texts...")
        
        df = df.copy()
        
        results = self.batch_extract(df[text_column].tolist())
        
        df['extracted_locations'] = [', '.join(r['locations']) for r in results]
        df['extracted_organizations'] = [', '.join(r['organizations']) for r in results]
        df['extracted_dates'] = [', '.join(r['dates']) for r in results]
        df['extracted_times'] = [', '.join(r['times']) for r in results]
        
        df['location_count'] = [len(r['locations']) for r in results]
        df['organization_count'] = [len(r['organizations']) for r in results]
        df['date_count'] = [len(r['dates']) for r in results]
        df['time_count'] = [len(r['times']) for r in results]
        
        df['has_location'] = (df['location_count'] > 0).astype(int)
        df['has_organization'] = (df['organization_count'] > 0).astype(int)
        df['has_date'] = (df['date_count'] > 0).astype(int)
        df['has_time'] = (df['time_count'] > 0).astype(int)
        
        df['total_entities'] = [len(r['all_entities']) for r in results]
        
        logger.info(" Entity extraction complete")
        return df
    
    def train(self, train_data=None, val_data=None, **kwargs):
        logger.info("Using pre-trained spaCy model (no training required)")
        return {'status': 'pre-trained model'}
    
    def predict(self, input_data):
        if isinstance(input_data, str):
            return self.extract_entities(input_data)
        elif isinstance(input_data, list):
            return self.batch_extract(input_data)
        else:
            raise ValueError("Input must be string or list of strings")
    
    def save(self, path: Path):
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        
        metadata = {
            'model_name': self.model_name,
            'entity_categories': self.entity_categories,
            'is_trained': self.is_trained
        }
        
        with open(path / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model configuration saved to {path}")
    
    def load(self, path: Path):
        path = Path(path)
        
        with open(path / 'metadata.json', 'r') as f:
            metadata = json.load(f)
        
        self.entity_categories = metadata.get('entity_categories', self.entity_categories)
        
        logger.info(f"Model configuration loaded from {path}")


if __name__ == "__main__":
    ner = NamedEntityRecognizer()
    
    test_texts = [
        "Tsunami reported near Mumbai on January 15th at 3:00 PM.",
        "INCOIS issued a cyclone warning for Kerala coast on Monday.",
        "Residents of Chennai reported high waves at Marina Beach yesterday.",
        "The National Disaster Management Authority coordinated with local officials.",
        "Storm surge affected 50,000 people along the eastern coastline."
    ]
    
    print("NAMED ENTITY RECOGNITION EXAMPLES")
    
    for i, text in enumerate(test_texts, 1):
        print(f"\n{'─'*80}")
        print(f"Text {i}: {text}")
        
        entities = ner.extract_entities(text)
        
        if entities['locations']:
            print(f"Locations: {', '.join(entities['locations'])}")
        if entities['organizations']:
            print(f"Organizations: {', '.join(entities['organizations'])}")
        if entities['dates']:
            print(f"Dates: {', '.join(entities['dates'])}")
        if entities['times']:
            print(f"Times: {', '.join(entities['times'])}")
        if entities['quantities']:
            print(f"Quantities: {', '.join(entities['quantities'])}")
        
        print(f"Total entities: {len(entities['all_entities'])}")