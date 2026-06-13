import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Optional
import logging
from sklearn.model_selection import train_test_split
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))

from config.settings import settings
from src.preprocessing.text_preprocessor import TextPreprocessor
from src.preprocessing.feature_engineer import FeatureEngineer
from src.preprocessing.data_cleaner import DataCleaner

logger = logging.getLogger(__name__)

class PreprocessingPipeline:
    
    def __init__(self):
        self.text_preprocessor = TextPreprocessor()
        self.feature_engineer = FeatureEngineer()
        self.data_cleaner = DataCleaner()
        
        logger.info("PreprocessingPipeline initialized")
    
    def preprocess_text_data(
        self,
        df: pd.DataFrame,
        text_column: str = 'text'
    ) -> pd.DataFrame:
   
        logger.info(f"Preprocessing text in column: {text_column}")
        df = df.copy()
        
        df['text_clean'] = df[text_column].apply(
            self.text_preprocessor.get_simple_processed
        )
        
        logger.info("Extracting named entities...")
        entities_list = df[text_column].apply(
            lambda x: self.text_preprocessor.extract_entities(x)
        )
        
        df['extracted_locations'] = entities_list.apply(
            lambda x: ', '.join(x['locations']) if x['locations'] else ''
        )
        df['location_count'] = entities_list.apply(lambda x: len(x['locations']))
        df['has_location_entity'] = (df['location_count'] > 0).astype(int)
        
        logger.info("Text preprocessing complete")
        return df
    
    def run_full_pipeline(
        self,
        input_file: Path,
        output_prefix: str,
        text_column: str = 'text',
        timestamp_column: str = 'timestamp',
        test_size: float = None,
        val_size: float = None
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        logger.info("="*80)
        logger.info(f"STARTING PREPROCESSING PIPELINE: {output_prefix}")
        logger.info("="*80)
        
        logger.info(f"Loading data from {input_file}...")
        df = pd.read_csv(input_file)
        logger.info(f"Loaded {len(df)} records with {len(df.columns)} columns")
        
        logger.info("\nStep 1: Data Cleaning")
        logger.info("-"*80)
        df = self.data_cleaner.full_clean(df, text_col=text_column)
        logger.info(f"After cleaning: {len(df)} records")
        
        logger.info("\nStep 2: Text Preprocessing")
        logger.info("-"*80)
        df = self.preprocess_text_data(df, text_column=text_column)
        
        logger.info("\nStep 3: Feature Engineering")
        logger.info("-"*80)
        df = self.feature_engineer.create_all_features(
            df,
            text_column=text_column,
            timestamp_column=timestamp_column
        )
        
        logger.info(f"Total features created: {len(df.columns)}")
        
        logger.info("\nStep 4: Splitting Data")
        logger.info("-"*80)
        
        if test_size is None:
            test_size = settings.TEST_SIZE
        if val_size is None:
            val_size = settings.VALIDATION_SIZE
        
        stratify_col = None
        if 'is_hazard' in df.columns:
            stratify_col = df['is_hazard']
        elif 'hazard_type' in df.columns:
            stratify_col = df['hazard_type']
        
        train_val_df, test_df = train_test_split(
            df,
            test_size=test_size,
            random_state=settings.RANDOM_SEED,
            stratify=stratify_col
        )
        
        if val_size > 0:
            val_size_adjusted = val_size / (1 - test_size)
            
            if stratify_col is not None:
                stratify_train_val = train_val_df['is_hazard'] if 'is_hazard' in train_val_df.columns else train_val_df['hazard_type']
            else:
                stratify_train_val = None
            
            train_df, val_df = train_test_split(
                train_val_df,
                test_size=val_size_adjusted,
                random_state=settings.RANDOM_SEED,
                stratify=stratify_train_val
            )
        else:
            train_df = train_val_df
            val_df = pd.DataFrame()
        
        logger.info(f"Train set: {len(train_df)} records ({len(train_df)/len(df)*100:.1f}%)")
        if len(val_df) > 0:
            logger.info(f"Validation set: {len(val_df)} records ({len(val_df)/len(df)*100:.1f}%)")
        logger.info(f"Test set: {len(test_df)} records ({len(test_df)/len(df)*100:.1f}%)")
        
        logger.info("\nStep 5: Saving Processed Data")

        
        output_dir = settings.PROCESSED_DATA_DIR
        output_dir.mkdir(parents=True, exist_ok=True)
        
        train_path = output_dir / f'{output_prefix}_train.csv'
        train_df.to_csv(train_path, index=False)
        logger.info(f" Saved train set: {train_path}")
        
        if len(val_df) > 0:
            val_path = output_dir / f'{output_prefix}_val.csv'
            val_df.to_csv(val_path, index=False)
            logger.info(f" Saved validation set: {val_path}")
        
        test_path = output_dir / f'{output_prefix}_test.csv'
        test_df.to_csv(test_path, index=False)
        logger.info(f" Saved test set: {test_path}")
        
        feature_list_path = output_dir / f'{output_prefix}_features.txt'
        with open(feature_list_path, 'w') as f:
            for col in sorted(df.columns):
                f.write(f"{col}\n")
        logger.info(f" Saved feature list: {feature_list_path}")
        
        stats = self._generate_statistics(train_df, val_df, test_df)
        stats_path = output_dir / f'{output_prefix}_statistics.txt'
        with open(stats_path, 'w') as f:
            f.write(stats)
        logger.info(f" Saved statistics: {stats_path}")
        
        logger.info("PREPROCESSING PIPELINE COMPLETE!")
        
        return train_df, val_df, test_df
    
    def _generate_statistics(
        self,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        test_df: pd.DataFrame
    ) -> str:
        stats = []
        stats.append("PREPROCESSING STATISTICS")
        
        stats.append(f"\nDataset Sizes:")
        stats.append(f"  Train:      {len(train_df):,} records")
        if len(val_df) > 0:
            stats.append(f"  Validation: {len(val_df):,} records")
        stats.append(f"  Test:       {len(test_df):,} records")
        stats.append(f"  Total:      {len(train_df) + len(val_df) + len(test_df):,} records")
        
        stats.append(f"\nFeature Count: {len(train_df.columns)}")
        
        if 'is_hazard' in train_df.columns:
            stats.append(f"\nClass Distribution:")
            for dataset_name, dataset in [('Train', train_df), ('Val', val_df), ('Test', test_df)]:
                if len(dataset) == 0:
                    continue
                hazard_count = dataset['is_hazard'].sum()
                hazard_pct = hazard_count / len(dataset) * 100
                stats.append(f"  {dataset_name}:")
                stats.append(f"    Hazard:     {hazard_count:,} ({hazard_pct:.1f}%)")
                stats.append(f"    Non-hazard: {len(dataset) - hazard_count:,} ({100-hazard_pct:.1f}%)")
        
        if 'hazard_type' in train_df.columns:
            stats.append(f"\nHazard Type Distribution (Train):")
            for hazard, count in train_df[train_df['hazard_type'].notna()]['hazard_type'].value_counts().items():
                pct = count / len(train_df) * 100
                stats.append(f"  {hazard}: {count:,} ({pct:.1f}%)")
        
        stats.append("\n" + "="*80)
        
        return "\n".join(stats)


def main():
    pipeline = PreprocessingPipeline()
    
    print("PROCESSING SOCIAL MEDIA DATA")
    print("\n")
    
    social_train, social_val, social_test = pipeline.run_full_pipeline(
        input_file=settings.RAW_DATA_DIR / 'simulated_social_media_posts.csv',
        output_prefix='social_media',
        text_column='text',
        timestamp_column='timestamp'
    )
    
    print("PROCESSING CITIZEN REPORTS")
    print("\n")
    
    reports_train, reports_val, reports_test = pipeline.run_full_pipeline(
        input_file=settings.RAW_DATA_DIR / 'simulated_citizen_reports.csv',
        output_prefix='citizen_reports',
        text_column='description',
        timestamp_column='timestamp'
    )
    
    print("\n")
    print(" ALL PREPROCESSING COMPLETE!")
    print("\nProcessed files saved to:")
    print(f"  {settings.PROCESSED_DATA_DIR}")
    print("\n")


if __name__ == "__main__":
    main()