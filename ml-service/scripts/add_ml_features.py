import sys
from pathlib import Path
import pandas as pd
import logging

sys.path.append(str(Path(__file__).parent.parent))

from config.settings import settings
from src.models.sentiment_model import SentimentAnalyzer
from src.models.ner_model import NamedEntityRecognizer

logger = logging.getLogger(__name__)

def main():
    print("ADDING ML FEATURES TO PREPROCESSED DATA")
    
    print("\nInitializing models...")
    sentiment_analyzer = SentimentAnalyzer()
    ner = NamedEntityRecognizer()
    
    datasets = [
        ('social_media_train.csv', 'text'),
        ('social_media_val.csv', 'text'),
        ('social_media_test.csv', 'text'),
        ('citizen_reports_train.csv', 'description'),
        ('citizen_reports_val.csv', 'description'),
        ('citizen_reports_test.csv', 'description')
    ]
    
    for filename, text_col in datasets:
        print(f"\n{'='*80}")
        print(f"Processing: {filename}")
        print(f"{'='*80}")

        filepath = settings.PROCESSED_DATA_DIR / filename
        if not filepath.exists():
            print(f"File not found, skipping: {filepath}")
            continue
        
        df = pd.read_csv(filepath)
        print(f"Loaded {len(df)} records")
        
        print("\nAdding sentiment features...")
        df = sentiment_analyzer.add_sentiment_features(df, text_column=text_col)
        
        print("Adding NER features...")
        df = ner.add_entity_features(df, text_column=text_col)
        
        output_filename = filename.replace('.csv', '_enhanced.csv')
        output_path = settings.PROCESSED_DATA_DIR / output_filename
        df.to_csv(output_path, index=False)
        
        print(f"✓ Saved enhanced dataset: {output_path}")
        print(f"  Total columns: {len(df.columns)}")
    
    print(" FEATURE ENHANCEMENT COMPLETE!")
    print("\nEnhanced datasets saved with '_enhanced.csv' suffix")
    print("These datasets include sentiment analysis and NER features!")

if __name__ == "__main__":
    main()