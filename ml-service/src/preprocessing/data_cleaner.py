import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class DataCleaner:
    
    def __init__(self):
        logger.info("DataCleaner initialized")
    
    def remove_duplicates(
        self,
        df: pd.DataFrame,
        subset: Optional[List[str]] = None,
        keep: str = 'first'
    ) -> pd.DataFrame:
        initial_count = len(df)
        df_clean = df.drop_duplicates(subset=subset, keep=keep)
        removed = initial_count - len(df_clean)
        
        if removed > 0:
            logger.info(f"Removed {removed} duplicate rows ({removed/initial_count*100:.1f}%)")
        
        return df_clean
    
    def handle_missing_values(
        self,
        df: pd.DataFrame,
        strategy: Dict[str, str] = None
    ) -> pd.DataFrame:
        df_clean = df.copy()
        
        missing = df_clean.isnull().sum()
        if missing.sum() > 0:
            logger.info("Missing values found:")
            for col, count in missing[missing > 0].items():
                logger.info(f"  {col}: {count} ({count/len(df)*100:.1f}%)")
        
        if strategy is None:
            strategy = {}
        
        for col, strat in strategy.items():
            if col not in df_clean.columns:
                continue
            
            if strat == 'drop':
                df_clean = df_clean.dropna(subset=[col])
            elif strat == 'fill_zero':
                df_clean[col].fillna(0, inplace=True)
            elif strat == 'fill_mean':
                df_clean[col].fillna(df_clean[col].mean(), inplace=True)
            elif strat == 'fill_median':
                df_clean[col].fillna(df_clean[col].median(), inplace=True)
            elif strat == 'fill_mode':
                df_clean[col].fillna(df_clean[col].mode()[0], inplace=True)
            elif isinstance(strat, tuple) and strat[0] == 'fill_value':
                df_clean[col].fillna(strat[1], inplace=True)
        
        return df_clean
    
    def remove_outliers(
        self,
        df: pd.DataFrame,
        columns: List[str],
        method: str = 'iqr',
        threshold: float = 1.5
    ) -> pd.DataFrame:
        df_clean = df.copy()
        initial_count = len(df_clean)
        
        for col in columns:
            if col not in df_clean.columns:
                continue
            
            if method == 'iqr':
                Q1 = df_clean[col].quantile(0.25)
                Q3 = df_clean[col].quantile(0.75)
                IQR = Q3 - Q1
                
                lower_bound = Q1 - threshold * IQR
                upper_bound = Q3 + threshold * IQR
                
                df_clean = df_clean[
                    (df_clean[col] >= lower_bound) & (df_clean[col] <= upper_bound)
                ]
            
            elif method == 'zscore':
                from scipy import stats
                z_scores = np.abs(stats.zscore(df_clean[col]))
                df_clean = df_clean[z_scores < threshold]
        
        removed = initial_count - len(df_clean)
        if removed > 0:
            logger.info(f"Removed {removed} outlier rows ({removed/initial_count*100:.1f}%)")
        
        return df_clean
    
    def validate_coordinates(
        self,
        df: pd.DataFrame,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude',
        bounds: Dict[str, Tuple[float, float]] = None
    ) -> pd.DataFrame:
        df_clean = df.copy()
        initial_count = len(df_clean)
        
        df_clean = df_clean[
            (df_clean[lat_col] >= -90) & (df_clean[lat_col] <= 90) &
            (df_clean[lon_col] >= -180) & (df_clean[lon_col] <= 180)
        ]
        
        if bounds:
            if 'lat' in bounds:
                min_lat, max_lat = bounds['lat']
                df_clean = df_clean[
                    (df_clean[lat_col] >= min_lat) & (df_clean[lat_col] <= max_lat)
                ]
            
            if 'lon' in bounds:
                min_lon, max_lon = bounds['lon']
                df_clean = df_clean[
                    (df_clean[lon_col] >= min_lon) & (df_clean[lon_col] <= max_lon)
                ]
        
        removed = initial_count - len(df_clean)
        if removed > 0:
            logger.info(f"Removed {removed} rows with invalid coordinates")
        
        return df_clean
    
    def clean_text_column(
        self,
        df: pd.DataFrame,
        text_col: str = 'text',
        min_length: int = 5,
        max_length: Optional[int] = None
    ) -> pd.DataFrame:
        df_clean = df.copy()
        initial_count = len(df_clean)
        
        df_clean = df_clean[df_clean[text_col].notna()]
        df_clean = df_clean[df_clean[text_col].str.strip() != '']
        
        df_clean['_text_length'] = df_clean[text_col].str.len()
        df_clean = df_clean[df_clean['_text_length'] >= min_length]
        
        if max_length:
            df_clean = df_clean[df_clean['_text_length'] <= max_length]
        
        df_clean = df_clean.drop('_text_length', axis=1)
        
        removed = initial_count - len(df_clean)
        if removed > 0:
            logger.info(f"Removed {removed} rows with invalid text")
        
        return df_clean
    
    def full_clean(
        self,
        df: pd.DataFrame,
        text_col: str = 'text',
        remove_dups: bool = True,
        clean_coords: bool = True
    ) -> pd.DataFrame:
        logger.info(f"Starting full clean pipeline. Input shape: {df.shape}")
        
        df_clean = df.copy()
        
        if remove_dups:
            df_clean = self.remove_duplicates(df_clean, subset=[text_col])
        
        df_clean = self.clean_text_column(df_clean, text_col)
        
        if clean_coords and 'latitude' in df_clean.columns and 'longitude' in df_clean.columns:
            india_bounds = {
                'lat': (6.0, 30.0),
                'lon': (65.0, 100.0)
            }
            df_clean = self.validate_coordinates(df_clean, bounds=india_bounds)
        
        logger.info(f"Completed full clean. Output shape: {df_clean.shape}")
        return df_clean


if __name__ == "__main__":
    import sys
    from pathlib import Path
    
    sys.path.append(str(Path(__file__).parent.parent.parent))
    from config.settings import settings
    
    df = pd.read_csv(settings.RAW_DATA_DIR / 'simulated_social_media_posts.csv')
    print(f"Loaded {len(df)} records")
    
    cleaner = DataCleaner()
    df_clean = cleaner.full_clean(df)
    
    print(f"\nCleaned data: {len(df_clean)} records")
    print(f"Removed: {len(df) - len(df_clean)} records")