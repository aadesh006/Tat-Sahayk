"""
Analyze trends in hazard reports over time
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import logging
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))
from config.settings import settings

logger = logging.getLogger(__name__)

class TrendAnalyzer:
    def __init__(self):
        logger.info("TrendAnalyzer initialized")
    
    def calculate_trend(
        self,
        df: pd.DataFrame,
        window_hours: int = 6
    ) -> str:
        if 'timestamp' not in df.columns or len(df) < 2:
            return 'unknown'
        
        df = df.copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        cutoff = datetime.now() - timedelta(hours=window_hours)
        recent = df[df['timestamp'] >= cutoff]
        previous = df[df['timestamp'] < cutoff]
        
        if len(previous) == 0 or len(recent) == 0:
            return 'insufficient_data'
        recent_rate = len(recent) / window_hours
        previous_rate = len(previous) / window_hours
        change = (recent_rate - previous_rate) / (previous_rate + 0.1)
        
        if change > 0.2:
            return 'increasing'
        elif change < -0.2:
            return 'decreasing'
        else:
            return 'stable'
    
    def detect_spikes(
        self,
        df: pd.DataFrame,
        threshold_std: float = 2.0
    ) -> List[Dict]:
        if 'timestamp' not in df.columns:
            return []
        
        df = df.copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        hourly_counts = df.set_index('timestamp').resample('H').size()
        mean_count = hourly_counts.mean()
        std_count = hourly_counts.std()
        spikes = []
        for timestamp, count in hourly_counts.items():
            if count > mean_count + (threshold_std * std_count):
                spikes.append({
                    'timestamp': timestamp,
                    'count': count,
                    'deviation': (count - mean_count) / std_count
                })
        
        logger.info(f"Detected {len(spikes)} spikes")
        return spikes
    
    def analyze_temporal_patterns(
        self,
        df: pd.DataFrame
    ) -> Dict:
        if 'timestamp' not in df.columns:
            return {}
        
        df = df.copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        
        patterns = {
            'busiest_hour': int(df['hour'].mode()[0]),
            'busiest_day': int(df['day_of_week'].mode()[0]),
            'hourly_distribution': df['hour'].value_counts().to_dict(),
            'daily_distribution': df['day_of_week'].value_counts().to_dict()
        }
        
        return patterns


# Example usage
if __name__ == "__main__":
    df = pd.read_csv(settings.PROCESSED_DATA_DIR / 'social_media_test_enhanced.csv')
    
    analyzer = TrendAnalyzer()
    trend = analyzer.calculate_trend(df, window_hours=12)
    print(f"Trend: {trend}")
    spikes = analyzer.detect_spikes(df)
    print(f"\nDetected {len(spikes)} spikes")
    patterns = analyzer.analyze_temporal_patterns(df)
    print(f"\nBusiest hour: {patterns.get('busiest_hour')}")
    print(f"Busiest day: {patterns.get('busiest_day')}")