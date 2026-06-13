import pandas as pd
import numpy as np
from typing import List, Dict, Optional
from sklearn.cluster import DBSCAN
from datetime import datetime, timedelta
import logging
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))
from config.settings import settings
from src.analytics.geospatial_analysis import GeospatialAnalyzer

logger = logging.getLogger(__name__)

class HotspotGenerator:
    
    def __init__(
        self,
        min_reports: int = None,
        radius_km: float = None,
        time_window_hours: Optional[int] = 24
    ):
        self.min_reports = min_reports or settings.HOTSPOT_MIN_REPORTS
        self.radius_km = radius_km or settings.HOTSPOT_RADIUS_KM
        self.time_window_hours = time_window_hours
        
        self.geo_analyzer = GeospatialAnalyzer()
        
        logger.info(f"HotspotGenerator initialized: min_reports={self.min_reports}, radius={self.radius_km}km")
    
    def detect_clusters(
        self,
        df: pd.DataFrame,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude'
    ) -> pd.DataFrame:
        logger.info(f"Detecting clusters in {len(df)} reports...")
        
        df = df.copy()
        
        if len(df) < self.min_reports:
            logger.warning(f"Not enough reports ({len(df)}) for clustering")
            df['cluster_id'] = -1
            return df
        
        coords = df[[lat_col, lon_col]].values
        
        eps_degrees = self.radius_km / 111.0
        
        clustering = DBSCAN(
            eps=eps_degrees,
            min_samples=self.min_reports,
            metric='euclidean'
        ).fit(coords)
        
        df['cluster_id'] = clustering.labels_
        
        n_clusters = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)
        n_noise = list(clustering.labels_).count(-1)
        
        logger.info(f" Found {n_clusters} clusters, {n_noise} noise points")
        
        return df
    
    def calculate_threat_level(
        self,
        report_count: int,
        avg_severity: float,
        avg_panic: float,
        time_recency: float = 1.0
    ) -> float:
        report_score = min(np.log1p(report_count) / np.log1p(100), 1.0) * 4
        
        severity_score = avg_severity * 3
        
        panic_score = avg_panic * 2
        
        recency_score = time_recency * 1
        
        threat_level = report_score + severity_score + panic_score + recency_score
        
        return min(threat_level, 10.0)  
    
    def categorize_severity(self, threat_level: float) -> str:
        if threat_level >= 8:
            return 'critical'
        elif threat_level >= 6:
            return 'high'
        elif threat_level >= 4:
            return 'medium'
        else:
            return 'low'
    
    def generate_hotspots(
        self,
        df: pd.DataFrame,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude',
        timestamp_col: Optional[str] = 'timestamp'
    ) -> List[Dict]:
        logger.info("Generating hotspots...")
        
        df = self.detect_clusters(df, lat_col, lon_col)
        
        hotspots = []
        
        unique_clusters = [c for c in df['cluster_id'].unique() if c != -1]
        
        for cluster_id in unique_clusters:
            cluster_df = df[df['cluster_id'] == cluster_id].copy()
            
            center_lat, center_lon = self.geo_analyzer.calculate_center_of_mass(
                cluster_df, lat_col, lon_col
            )
            
            if 'hazard_type' in cluster_df.columns:
                hazard_counts = cluster_df['hazard_type'].value_counts()
                dominant_hazard = hazard_counts.index[0] if len(hazard_counts) > 0 else 'unknown'
                hazard_distribution = hazard_counts.to_dict()
            else:
                dominant_hazard = 'unknown'
                hazard_distribution = {}
            
            if 'severity' in cluster_df.columns:
                severity_mapping = {'low': 0.25, 'medium': 0.5, 'high': 0.75, 'critical': 1.0}
                avg_severity = cluster_df['severity'].map(severity_mapping).mean()
            else:
                avg_severity = 0.5
            
            if 'panic_level' in cluster_df.columns:
                panic_mapping = {'low': 0.25, 'medium': 0.5, 'high': 0.75, 'critical': 1.0}
                avg_panic = cluster_df['panic_level'].map(panic_mapping).mean()
            elif 'predicted_panic_level' in cluster_df.columns:
                panic_mapping = {'low': 0.25, 'medium': 0.5, 'high': 0.75, 'critical': 1.0}
                avg_panic = cluster_df['predicted_panic_level'].map(panic_mapping).mean()
            else:
                avg_panic = 0.5
            
            time_recency = 1.0
            if timestamp_col and timestamp_col in cluster_df.columns:
                cluster_df[timestamp_col] = pd.to_datetime(cluster_df[timestamp_col])
                latest_time = cluster_df[timestamp_col].max()
                time_diff = datetime.now() - latest_time
                hours_old = time_diff.total_seconds() / 3600
                
                time_recency = max(0.5, 1.0 - (hours_old / 48))
            
            report_count = len(cluster_df)
            threat_level = self.calculate_threat_level(
                report_count, avg_severity, avg_panic, time_recency
            )
            
            severity = self.categorize_severity(threat_level)
            
            distances = cluster_df.apply(
                lambda row: self.geo_analyzer.haversine_distance(
                    center_lat, center_lon, row[lat_col], row[lon_col]
                ),
                axis=1
            )
            actual_radius = distances.max()
            
            if timestamp_col and timestamp_col in cluster_df.columns:
                earliest_report = cluster_df[timestamp_col].min()
                latest_report = cluster_df[timestamp_col].max()
            else:
                earliest_report = None
                latest_report = None
            
            hotspot = {
                'hotspot_id': f'HS_{cluster_id:04d}',
                'cluster_id': int(cluster_id),
                'latitude': float(center_lat),
                'longitude': float(center_lon),
                'radius_km': float(actual_radius),
                'hazard_type': dominant_hazard,
                'hazard_distribution': hazard_distribution,
                'severity': severity,
                'threat_level': float(threat_level),
                'report_count': int(report_count),
                'avg_severity_score': float(avg_severity),
                'avg_panic_score': float(avg_panic),
                'time_recency_score': float(time_recency),
                'earliest_report': earliest_report.isoformat() if earliest_report else None,
                'latest_report': latest_report.isoformat() if latest_report else None,
                'active': True,
                'created_at': datetime.now().isoformat()
            }
            
            hotspots.append(hotspot)
        
        hotspots = sorted(hotspots, key=lambda x: x['threat_level'], reverse=True)
        
        logger.info(f" Generated {len(hotspots)} hotspots")
        
        return hotspots
    
    def create_hotspot_dataframe(self, hotspots: List[Dict]) -> pd.DataFrame:
        if not hotspots:
            return pd.DataFrame()
        
        return pd.DataFrame(hotspots)
    
    def filter_active_hotspots(
        self,
        hotspots: List[Dict],
        max_age_hours: int = 24
    ) -> List[Dict]:
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        
        active = [
            hs for hs in hotspots
            if hs['latest_report'] and 
            datetime.fromisoformat(hs['latest_report']) > cutoff_time
        ]
        
        logger.info(f"Filtered to {len(active)} active hotspots (within {max_age_hours}h)")
        
        return active
    
    def merge_nearby_hotspots(
        self,
        hotspots: List[Dict],
        merge_distance_km: float = 10
    ) -> List[Dict]:
        if len(hotspots) < 2:
            return hotspots
        df = self.create_hotspot_dataframe(hotspots)
        
        merged_indices = set()
        merged_hotspots = []
        
        for i, row1 in df.iterrows():
            if i in merged_indices:
                continue
            nearby_indices = []
            for j, row2 in df.iterrows():
                if i != j and j not in merged_indices:
                    distance = self.geo_analyzer.haversine_distance(
                        row1['latitude'], row1['longitude'],
                        row2['latitude'], row2['longitude']
                    )
                    if distance <= merge_distance_km:
                        nearby_indices.append(j)
            
            if nearby_indices:
                merge_group = df.loc[[i] + nearby_indices]
                
                center_lat = np.average(
                    merge_group['latitude'],
                    weights=merge_group['report_count']
                )
                center_lon = np.average(
                    merge_group['longitude'],
                    weights=merge_group['report_count']
                )
                
                total_reports = merge_group['report_count'].sum()
                
                max_threat = merge_group['threat_level'].max()
                severity = self.categorize_severity(max_threat)
                
                hazard_counts = {}
                for hs_dict in hotspots:
                    if hs_dict.get('cluster_id') in merge_group['cluster_id'].values:
                        for hazard, count in hs_dict.get('hazard_distribution', {}).items():
                            hazard_counts[hazard] = hazard_counts.get(hazard, 0) + count
                
                dominant_hazard = max(hazard_counts.items(), key=lambda x: x[1])[0] if hazard_counts else 'unknown'
                
                merged_hotspot = {
                    'hotspot_id': f'HS_MERGED_{i:04d}',
                    'cluster_id': -1,
                    'latitude': float(center_lat),
                    'longitude': float(center_lon),
                    'radius_km': float(merge_distance_km),
                    'hazard_type': dominant_hazard,
                    'hazard_distribution': hazard_counts,
                    'severity': severity,
                    'threat_level': float(max_threat),
                    'report_count': int(total_reports),
                    'merged_count': len(nearby_indices) + 1,
                    'active': True,
                    'created_at': datetime.now().isoformat()
                }
                
                merged_hotspots.append(merged_hotspot)
                merged_indices.update([i] + nearby_indices)
            else:
                merged_hotspots.append(hotspots[i])
                merged_indices.add(i)
        
        logger.info(f"Merged {len(hotspots)} hotspots into {len(merged_hotspots)}")
        
        return merged_hotspots

if __name__ == "__main__":
    from config.settings import settings
    
    df = pd.read_csv(settings.PROCESSED_DATA_DIR / 'social_media_test_enhanced.csv')
    
    hazard_df = df[df['is_hazard'] == True].copy()
    
    print(f"\n")
    print("HOTSPOT DETECTION TEST")
    print(f"\n")
    print(f"\nAnalyzing {len(hazard_df)} hazard reports...")
    
    generator = HotspotGenerator(min_reports=3, radius_km=10)
    hotspots = generator.generate_hotspots(hazard_df)
    
    print(f"\nDetected {len(hotspots)} hotspots")
    
    if hotspots:
        hotspots_df = generator.create_hotspot_dataframe(hotspots)
        
        print(f"\n")
        print("HOTSPOT SUMMARY")
        print(f"\n")
        print(hotspots_df[[
            'hotspot_id', 'hazard_type', 'severity', 
            'report_count', 'threat_level'
        ]].to_string(index=False))
        
        output_path = settings.DATA_DIR / 'detected_hotspots.csv'
        hotspots_df.to_csv(output_path, index=False)
        print(f"\n Saved hotspots to {output_path}")
        
        print(f"\n")
        print("TOP 3 HOTSPOTS")
        print(f"\n")
        
        for i, hotspot in enumerate(hotspots[:3], 1):
            print(f"\n{i}. Hotspot ID: {hotspot['hotspot_id']}")
            print(f"   Location: ({hotspot['latitude']:.4f}, {hotspot['longitude']:.4f})")
            print(f"   Hazard Type: {hotspot['hazard_type']}")
            print(f"   Severity: {hotspot['severity']}")
            print(f"   Threat Level: {hotspot['threat_level']:.2f}/10")
            print(f"   Reports: {hotspot['report_count']}")
            print(f"   Radius: {hotspot['radius_km']:.2f} km")