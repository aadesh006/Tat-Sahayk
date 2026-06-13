import pandas as pd
import numpy as np
from typing import Dict, List
import logging
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))
from config.settings import settings

logger = logging.getLogger(__name__)

class EngagementTracker:
    
    def __init__(self):
        logger.info("EngagementTracker initialized")
    
    def calculate_engagement_rate(
        self,
        df: pd.DataFrame,
        engagement_col: str = 'total_engagement',
        followers_col: str = 'author_followers'
    ) -> pd.DataFrame:
        df = df.copy()
        
        df['engagement_rate'] = (
            df[engagement_col] / (df[followers_col] + 1)
        ) * 100
        
        return df
    
    def identify_viral_content(
        self,
        df: pd.DataFrame,
        threshold_percentile: float = 90
    ) -> pd.DataFrame:
        df = df.copy()
        
        threshold = df['total_engagement'].quantile(threshold_percentile / 100)
        df['is_viral'] = (df['total_engagement'] >= threshold).astype(int)
        
        viral_count = df['is_viral'].sum()
        logger.info(f"Identified {viral_count} viral posts ({viral_count/len(df)*100:.1f}%)")
        
        return df
    
    def analyze_engagement_by_hazard(
        self,
        df: pd.DataFrame
    ) -> pd.DataFrame:
        if 'hazard_type' not in df.columns:
            logger.warning("hazard_type column not found")
            return pd.DataFrame()
        
        hazard_df = df[df['is_hazard'] == True].copy()
        
        engagement_stats = hazard_df.groupby('hazard_type').agg({
            'total_engagement': ['mean', 'median', 'sum'],
            'likes': 'mean',
            'shares': 'mean',
            'comments': 'mean'
        }).round(2)
        
        return engagement_stats
    
    def get_top_engaged_posts(
        self,
        df: pd.DataFrame,
        n: int = 10,
        metric: str = 'total_engagement'
    ) -> pd.DataFrame:
        """Get top N most engaged posts"""
        return df.nlargest(n, metric)

if __name__ == "__main__":
    df = pd.read_csv(settings.PROCESSED_DATA_DIR / 'social_media_test_enhanced.csv')
    
    tracker = EngagementTracker()
    df = tracker.calculate_engagement_rate(df)
    df = tracker.identify_viral_content(df)
    
    print(f"\nEngagement Rate Statistics:")
    print(df['engagement_rate'].describe())
    
    print(f"\nViral Posts: {df['is_viral'].sum()}")
    hazard_engagement = tracker.analyze_engagement_by_hazard(df)
    print(f"\nEngagement by Hazard Type:")
    print(hazard_engagement)