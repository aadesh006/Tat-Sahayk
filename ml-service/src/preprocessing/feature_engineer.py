import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
import re
from datetime import datetime
from collections import Counter
import logging

logger = logging.getLogger(__name__)

class FeatureEngineer:
    
    def __init__(self):
        
        self.hazard_keywords = {
            'tsunami': [
                'tsunami', 'tidal wave', 'sea surge', 'ocean wall', 'water wall',
                'receding water', 'unusual wave', 'seismic sea'
            ],
            'storm_surge': [
                'storm surge', 'high tide', 'coastal flood', 'sea flood',
                'inundation', 'storm flooding', 'tidal flooding'
            ],
            'high_waves': [
                'high waves', 'rough sea', 'dangerous waves', 'big waves',
                'choppy', 'heavy swell', 'massive waves', 'giant waves'
            ],
            'cyclone': [
                'cyclone', 'hurricane', 'typhoon', 'tropical storm',
                'storm system', 'low pressure', 'wind speed'
            ],
            'coastal_erosion': [
                'erosion', 'beach loss', 'coastal damage', 'land loss',
                'shoreline retreat', 'beach erosion', 'sand loss'
            ]
        }
        
        self.urgency_words = {
            'critical': [
                'emergency', 'urgent', 'evacuate', 'sos', 'help',
                'critical', 'disaster', 'immediate', 'now', 'asap'
            ],
            'high': [
                'warning', 'alert', 'danger', 'severe', 'serious',
                'major', 'significant', 'important'
            ],
            'medium': [
                'concern', 'watch', 'caution', 'advisory', 'moderate',
                'attention', 'notice'
            ],
            'low': [
                'update', 'information', 'minor', 'slight', 'possible'
            ]
        }
        
        self.action_words = [
            'evacuate', 'leave', 'move', 'shelter', 'avoid', 'stay away',
            'prepare', 'secure', 'protect', 'report', 'call', 'notify'
        ]
        
        self.temporal_words = {
            'immediate': ['now', 'immediately', 'right now', 'currently', 'ongoing'],
            'recent': ['just', 'recently', 'minutes ago', 'hours ago', 'earlier today'],
            'future': ['will', 'going to', 'expected', 'forecast', 'predicted']
        }
        
        logger.info("FeatureEngineer initialized")
    
    def extract_text_features(self, df: pd.DataFrame, text_column: str = 'text') -> pd.DataFrame:
 
        logger.info(f"Extracting text features from column: {text_column}")
        df = df.copy()
        
        df['text_length'] = df[text_column].str.len()
        df['word_count'] = df[text_column].str.split().str.len()
        df['avg_word_length'] = df['text_length'] / (df['word_count'] + 1)
        df['char_count'] = df[text_column].str.len()
        
        df['unique_word_count'] = df[text_column].apply(
            lambda x: len(set(str(x).lower().split())) if pd.notna(x) else 0
        )
        df['lexical_diversity'] = df['unique_word_count'] / (df['word_count'] + 1)
        
        df['uppercase_ratio'] = df[text_column].apply(
            lambda x: sum(1 for c in str(x) if c.isupper()) / (len(str(x)) + 1)
        )
        df['lowercase_ratio'] = df[text_column].apply(
            lambda x: sum(1 for c in str(x) if c.islower()) / (len(str(x)) + 1)
        )
        df['title_case_words'] = df[text_column].apply(
            lambda x: sum(1 for word in str(x).split() if word.istitle())
        )
        
        df['exclamation_count'] = df[text_column].str.count('!')
        df['question_count'] = df[text_column].str.count('\?')
        df['period_count'] = df[text_column].str.count('\.')
        df['comma_count'] = df[text_column].str.count(',')
        df['has_multiple_exclamations'] = (df['exclamation_count'] > 1).astype(int)
        
        df['hashtag_count'] = df[text_column].str.count('#')
        df['mention_count'] = df[text_column].str.count('@')
        df['url_count'] = df[text_column].apply(
            lambda x: len(re.findall(r'http\S+|www\S+', str(x)))
        )
        df['has_url'] = (df['url_count'] > 0).astype(int)
        
        df['emoji_count'] = df[text_column].apply(
            lambda x: len(re.findall(r'[^\w\s,]', str(x)))
        )
        
        df['number_count'] = df[text_column].apply(
            lambda x: len(re.findall(r'\d+', str(x)))
        )
        df['has_numbers'] = (df['number_count'] > 0).astype(int)
        
        logger.info(f"Added {12} basic text features")
        return df
    
    def extract_hazard_features(self, df: pd.DataFrame, text_column: str = 'text') -> pd.DataFrame:
     
        logger.info("Extracting hazard-specific features")
        df = df.copy()
        
        for hazard_type, keywords in self.hazard_keywords.items():
            col_name = f'has_{hazard_type}_keywords'
            df[col_name] = df[text_column].apply(
                lambda x: int(any(kw in str(x).lower() for kw in keywords))
            )
            
            col_count = f'{hazard_type}_keyword_count'
            df[col_count] = df[text_column].apply(
                lambda x: sum(1 for kw in keywords if kw in str(x).lower())
            )
        
        hazard_cols = [f'has_{ht}_keywords' for ht in self.hazard_keywords.keys()]
        df['total_hazard_indicators'] = df[hazard_cols].sum(axis=1)
        df['has_any_hazard_keyword'] = (df['total_hazard_indicators'] > 0).astype(int)
        
        logger.info(f"Added {len(self.hazard_keywords) * 2 + 2} hazard features")
        return df
    
    def extract_urgency_features(self, df: pd.DataFrame, text_column: str = 'text') -> pd.DataFrame:
        logger.info("Extracting urgency features")
        df = df.copy()
        

        for level, words in self.urgency_words.items():
            col_name = f'has_{level}_urgency'
            df[col_name] = df[text_column].apply(
                lambda x: int(any(word in str(x).lower() for word in words))
            )
            
            col_count = f'{level}_urgency_count'
            df[col_count] = df[text_column].apply(
                lambda x: sum(1 for word in words if word in str(x).lower())
            )
        

        weights = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        df['urgency_score'] = sum(
            df[f'{level}_urgency_count'] * weight 
            for level, weight in weights.items()
        )
        

        if df['urgency_score'].max() > 0:
            df['urgency_score_normalized'] = df['urgency_score'] / df['urgency_score'].max()
        else:
            df['urgency_score_normalized'] = 0
        
        df['action_word_count'] = df[text_column].apply(
            lambda x: sum(1 for word in self.action_words if word in str(x).lower())
        )
        df['has_action_words'] = (df['action_word_count'] > 0).astype(int)
        
        df['all_caps_word_count'] = df[text_column].apply(
            lambda x: sum(1 for word in str(x).split() if word.isupper() and len(word) > 1)
        )
        
        logger.info("Added urgency features")
        return df
    
    def extract_temporal_features(self, df: pd.DataFrame, timestamp_column: str = 'timestamp') -> pd.DataFrame:
        logger.info(f"Extracting temporal features from column: {timestamp_column}")
        df = df.copy()
        
        df[timestamp_column] = pd.to_datetime(df[timestamp_column])
        
        df['hour'] = df[timestamp_column].dt.hour
        df['day_of_week'] = df[timestamp_column].dt.dayofweek
        df['day_of_month'] = df[timestamp_column].dt.day
        df['month'] = df[timestamp_column].dt.month
        df['year'] = df[timestamp_column].dt.year
        df['week_of_year'] = df[timestamp_column].dt.isocalendar().week
        
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 6)).astype(int)
        df['is_morning'] = ((df['hour'] >= 6) & (df['hour'] < 12)).astype(int)
        df['is_afternoon'] = ((df['hour'] >= 12) & (df['hour'] < 18)).astype(int)
        df['is_evening'] = ((df['hour'] >= 18) & (df['hour'] < 22)).astype(int)
        
        def get_time_of_day(hour):
            if 6 <= hour < 12:
                return 'morning'
            elif 12 <= hour < 18:
                return 'afternoon'
            elif 18 <= hour < 22:
                return 'evening'
            else:
                return 'night'
        
        df['time_of_day'] = df['hour'].apply(get_time_of_day)
        
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        
        def get_season(month):
            if month in [12, 1, 2]:
                return 'winter'
            elif month in [3, 4, 5]:
                return 'spring'
            elif month in [6, 7, 8]:
                return 'monsoon'  
            else:
                return 'autumn'
        
        df['season'] = df['month'].apply(get_season)
        
        logger.info("Added temporal features")
        return df
    
    def extract_engagement_features(self, df: pd.DataFrame) -> pd.DataFrame:
        logger.info("Extracting engagement features")
        df = df.copy()
        
        engagement_cols = ['likes', 'shares', 'comments']
        has_engagement = all(col in df.columns for col in engagement_cols)
        
        if not has_engagement:
            logger.warning("Engagement columns not found, skipping engagement features")
            return df
        
        df['total_engagement'] = df['likes'] + df['shares'] + df['comments']
        
        if 'author_followers' in df.columns:
            df['engagement_rate'] = df['total_engagement'] / (df['author_followers'] + 1)
            df['likes_per_follower'] = df['likes'] / (df['author_followers'] + 1)
            df['shares_per_follower'] = df['shares'] / (df['author_followers'] + 1)
            
            df['virality_score'] = (df['shares'] / (df['author_followers'] + 1)) * 100
        
        df['share_ratio'] = df['shares'] / (df['total_engagement'] + 1)
        df['comment_ratio'] = df['comments'] / (df['total_engagement'] + 1)
        df['like_ratio'] = df['likes'] / (df['total_engagement'] + 1)
        
        df['high_engagement'] = (df['total_engagement'] > df['total_engagement'].median()).astype(int)
        
        df['log_total_engagement'] = np.log1p(df['total_engagement'])
        df['log_likes'] = np.log1p(df['likes'])
        df['log_shares'] = np.log1p(df['shares'])
        
        logger.info("Added engagement features")
        return df
    
    def extract_geospatial_features(self, df: pd.DataFrame) -> pd.DataFrame:
      
        logger.info("Extracting geospatial features")
        df = df.copy()
        
        if 'latitude' not in df.columns or 'longitude' not in df.columns:
            logger.warning("Latitude/Longitude columns not found")
            return df
        
        df['is_west_coast'] = (
            (df['latitude'] >= 8) & (df['latitude'] <= 28) &
            (df['longitude'] >= 68) & (df['longitude'] <= 78)
        ).astype(int)
        
        df['is_east_coast'] = (
            (df['latitude'] >= 8) & (df['latitude'] <= 22) &
            (df['longitude'] >= 80) & (df['longitude'] <= 97)
        ).astype(int)
        
        df['is_south_coast'] = (df['latitude'] <= 12).astype(int)
        df['is_north_coast'] = (df['latitude'] >= 20).astype(int)
        
        df['distance_from_equator'] = abs(df['latitude'])
        

        cell_size = 0.5  
        df['grid_lat'] = (df['latitude'] / cell_size).astype(int) * cell_size
        df['grid_lon'] = (df['longitude'] / cell_size).astype(int) * cell_size
        df['grid_id'] = df['grid_lat'].astype(str) + '_' + df['grid_lon'].astype(str)
        
        logger.info("Added geospatial features")
        return df
    
    def extract_author_features(self, df: pd.DataFrame) -> pd.DataFrame:
        logger.info("Extracting author features")
        df = df.copy()
        
        if 'author_followers' in df.columns:
            df['log_followers'] = np.log1p(df['author_followers'])
            df['high_follower_count'] = (df['author_followers'] > 10000).astype(int)
            df['micro_influencer'] = (
                (df['author_followers'] >= 1000) & (df['author_followers'] <= 100000)
            ).astype(int)
            
            def categorize_followers(count):
                if count < 100:
                    return 'low'
                elif count < 1000:
                    return 'medium'
                elif count < 10000:
                    return 'high'
                else:
                    return 'very_high'
            
            df['follower_category'] = df['author_followers'].apply(categorize_followers)
        
        if 'is_verified_account' in df.columns:
            df['is_verified'] = df['is_verified_account'].astype(int)
        
        logger.info("Added author features")
        return df
    
    def create_all_features(
        self,
        df: pd.DataFrame,
        text_column: str = 'text',
        timestamp_column: str = 'timestamp'
    ) -> pd.DataFrame:
        logger.info("Creating all features...")
        logger.info(f"Input shape: {df.shape}")
        
        original_cols = len(df.columns)
        
        df = self.extract_text_features(df, text_column)
        df = self.extract_hazard_features(df, text_column)
        df = self.extract_urgency_features(df, text_column)
        
        if timestamp_column in df.columns:
            df = self.extract_temporal_features(df, timestamp_column)
        
        df = self.extract_engagement_features(df)
        df = self.extract_geospatial_features(df)
        df = self.extract_author_features(df)
        
        new_cols = len(df.columns)
        logger.info(f"Output shape: {df.shape}")
        logger.info(f"Added {new_cols - original_cols} new features")
        
        return df


if __name__ == "__main__":
    import sys
    from pathlib import Path
    

    sys.path.append(str(Path(__file__).parent.parent.parent))
    from config.settings import settings
    

    df = pd.read_csv(settings.RAW_DATA_DIR / 'simulated_social_media_posts.csv')
    print(f"Loaded {len(df)} records")
    

    engineer = FeatureEngineer()
    df_featured = engineer.create_all_features(df)
    

    print("\nSample features:")
    feature_cols = [col for col in df_featured.columns if col not in df.columns]
    print(df_featured[['text'] + feature_cols[:10]].head())
    

    output_path = settings.PROCESSED_DATA_DIR / 'featured_sample.csv'
    df_featured.to_csv(output_path, index=False)
    print(f"\nSaved featured data to {output_path}")