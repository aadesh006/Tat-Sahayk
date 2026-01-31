import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional, Union
from math import radians, cos, sin, asin, sqrt, degrees, atan2
import logging
from pathlib import Path
import sys
from scipy.spatial import cKDTree
from functools import lru_cache
import warnings

sys.path.append(str(Path(__file__).parent.parent.parent))
from config.settings import settings

logger = logging.getLogger(__name__)

class GeospatialAnalyzer:
    
    def __init__(self, use_kdtree: bool = True):
        self.earth_radius_km = 6371.0
        self.use_kdtree = use_kdtree
        self._kdtree = None
        self._kdtree_data = None
        logger.info(f"GeospatialAnalyzer initialized (KD-Tree: {use_kdtree})")
    
    @staticmethod
    def haversine_distance_vectorized(
        lat1: Union[float, np.ndarray],
        lon1: Union[float, np.ndarray],
        lat2: Union[float, np.ndarray],
        lon2: Union[float, np.ndarray],
        earth_radius_km: float = 6371.0
    ) -> Union[float, np.ndarray]:
        lat1, lon1, lat2, lon2 = np.atleast_1d(lat1, lon1, lat2, lon2)
        lat1_rad = np.radians(lat1)
        lon1_rad = np.radians(lon1)
        lat2_rad = np.radians(lat2)
        lon2_rad = np.radians(lon2)
        
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = np.sin(dlat/2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        distance = earth_radius_km * c

        return float(distance[0]) if distance.size == 1 else distance
    
    def haversine_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        return self.haversine_distance_vectorized(lat1, lon1, lat2, lon2, self.earth_radius_km)
    
    @staticmethod
    def calculate_bearing_vectorized(
        lat1: Union[float, np.ndarray],
        lon1: Union[float, np.ndarray],
        lat2: Union[float, np.ndarray],
        lon2: Union[float, np.ndarray]
    ) -> Union[float, np.ndarray]:
        lat1_rad = np.radians(np.atleast_1d(lat1))
        lon1_rad = np.radians(np.atleast_1d(lon1))
        lat2_rad = np.radians(np.atleast_1d(lat2))
        lon2_rad = np.radians(np.atleast_1d(lon2))
        
        dlon = lon2_rad - lon1_rad
        
        y = np.sin(dlon) * np.cos(lat2_rad)
        x = np.cos(lat1_rad) * np.sin(lat2_rad) - np.sin(lat1_rad) * np.cos(lat2_rad) * np.cos(dlon)
        
        bearing = np.degrees(np.arctan2(y, x))
        bearing = (bearing + 360) % 360
        
        return float(bearing[0]) if bearing.size == 1 else bearing
    
    def calculate_bearing(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        return self.calculate_bearing_vectorized(lat1, lon1, lat2, lon2)
    
    def _build_kdtree(self, df: pd.DataFrame, lat_col: str, lon_col: str):
        coords = np.column_stack([
            np.radians(df[lat_col].values),
            np.radians(df[lon_col].values)
        ])
        self._kdtree = cKDTree(coords)
        self._kdtree_data = df
        logger.debug(f"Built KD-Tree with {len(df)} points")
    
    def find_nearby_reports(
        self,
        df: pd.DataFrame,
        center_lat: float,
        center_lon: float,
        radius_km: float = 10,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude',
        use_kdtree: bool = None
    ) -> pd.DataFrame:
        use_kdtree = use_kdtree if use_kdtree is not None else self.use_kdtree
        
        if use_kdtree and len(df) > 100:
            return self._find_nearby_kdtree(df, center_lat, center_lon, radius_km, lat_col, lon_col)
        else:
            return self._find_nearby_vectorized(df, center_lat, center_lon, radius_km, lat_col, lon_col)
    
    def _find_nearby_vectorized(
        self,
        df: pd.DataFrame,
        center_lat: float,
        center_lon: float,
        radius_km: float,
        lat_col: str,
        lon_col: str
    ) -> pd.DataFrame:
        df = df.copy()
        df['distance_km'] = self.haversine_distance_vectorized(
            center_lat,
            center_lon,
            df[lat_col].values,
            df[lon_col].values,
            self.earth_radius_km
        )
        nearby = df[df['distance_km'] <= radius_km].copy()
        nearby = nearby.sort_values('distance_km')
        
        logger.info(f"Found {len(nearby)} reports within {radius_km}km (vectorized)")
        return nearby
    
    def _find_nearby_kdtree(
        self,
        df: pd.DataFrame,
        center_lat: float,
        center_lon: float,
        radius_km: float,
        lat_col: str,
        lon_col: str
    ) -> pd.DataFrame:
        if self._kdtree is None or self._kdtree_data is not df:
            self._build_kdtree(df, lat_col, lon_col)
        radius_rad = radius_km / self.earth_radius_km
        center_rad = [np.radians(center_lat), np.radians(center_lon)]
        indices = self._kdtree.query_ball_point(center_rad, radius_rad)

        nearby = df.iloc[indices].copy()
        nearby['distance_km'] = self.haversine_distance_vectorized(
            center_lat,
            center_lon,
            nearby[lat_col].values,
            nearby[lon_col].values,
            self.earth_radius_km
        )
        
        nearby = nearby[nearby['distance_km'] <= radius_km].sort_values('distance_km')
        
        logger.info(f"Found {len(nearby)} reports within {radius_km}km (KD-Tree)")
        return nearby
    
    def create_grid_cells(
        self,
        df: pd.DataFrame,
        cell_size_km: float = 10,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude'
    ) -> pd.DataFrame:
        df = df.copy()
        
        cell_size_deg = cell_size_km / 111.0
        
        grid_lat = (df[lat_col].values / cell_size_deg).astype(int) * cell_size_deg
        grid_lon = (df[lon_col].values / cell_size_deg).astype(int) * cell_size_deg
        
        df['grid_lat'] = grid_lat
        df['grid_lon'] = grid_lon
        
        df['grid_id'] = (
            df['grid_lat'].round(2).astype(str) + '_' + 
            df['grid_lon'].round(2).astype(str)
        )
        
        logger.info(f"Created {df['grid_id'].nunique()} grid cells")
        return df
    
    def calculate_density(
        self,
        df: pd.DataFrame,
        radius_km: float = 20,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude',
        use_kdtree: bool = True
    ) -> pd.DataFrame:
        logger.info(f"Calculating density for {len(df)} points (optimized)")
        
        df = df.copy()
        
        if use_kdtree and len(df) > 100:
            densities = self._calculate_density_kdtree(df, radius_km, lat_col, lon_col)
        else:
            densities = self._calculate_density_vectorized(df, radius_km, lat_col, lon_col)
        
        df['report_density'] = densities
        
        logger.info(" Density calculation complete")
        return df
    
    def _calculate_density_kdtree(
        self,
        df: pd.DataFrame,
        radius_km: float,
        lat_col: str,
        lon_col: str
    ) -> np.ndarray:
        coords_rad = np.column_stack([
            np.radians(df[lat_col].values),
            np.radians(df[lon_col].values)
        ])
        tree = cKDTree(coords_rad)
        radius_rad = radius_km / self.earth_radius_km

        neighbor_counts = tree.query_ball_point(coords_rad, radius_rad, return_length=True)

        densities = neighbor_counts - 1
        
        return densities
    
    def _calculate_density_vectorized(
        self,
        df: pd.DataFrame,
        radius_km: float,
        lat_col: str,
        lon_col: str
    ) -> np.ndarray:
        n = len(df)
        lats = df[lat_col].values
        lons = df[lon_col].values
        densities = np.zeros(n, dtype=int)
        batch_size = 1000
        for i in range(0, n, batch_size):
            end_i = min(i + batch_size, n)
            distances = self.haversine_distance_vectorized(
                lats[i:end_i, np.newaxis],
                lons[i:end_i, np.newaxis],
                lats[np.newaxis, :],
                lons[np.newaxis, :],
                self.earth_radius_km
            )
            densities[i:end_i] = (distances <= radius_km).sum(axis=1) - 1
        
        return densities
    
    def get_bounding_box(
        self,
        df: pd.DataFrame,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude',
        padding_km: float = 0
    ) -> Dict[str, float]:
        min_lat = float(df[lat_col].min())
        max_lat = float(df[lat_col].max())
        min_lon = float(df[lon_col].min())
        max_lon = float(df[lon_col].max())

        if padding_km > 0:
            padding_deg = padding_km / 111.0
            min_lat -= padding_deg
            max_lat += padding_deg
            min_lon -= padding_deg
            max_lon += padding_deg
        
        return {
            'min_lat': min_lat,
            'max_lat': max_lat,
            'min_lon': min_lon,
            'max_lon': max_lon,
            'center_lat': (min_lat + max_lat) / 2,
            'center_lon': (min_lon + max_lon) / 2
        }
    
    def filter_by_region(
        self,
        df: pd.DataFrame,
        region: str,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude'
    ) -> pd.DataFrame:
        regions = {
            'west_coast': {'lat': (8, 28), 'lon': (68, 78)},
            'east_coast': {'lat': (8, 22), 'lon': (80, 97)},
            'south': {'lat': (8, 12), 'lon': (68, 97)},
            'north': {'lat': (20, 28), 'lon': (68, 97)}
        }
        
        if region not in regions:
            logger.warning(f"Unknown region: {region}")
            return df
        
        bounds = regions[region]
        mask = (
            (df[lat_col] >= bounds['lat'][0]) &
            (df[lat_col] <= bounds['lat'][1]) &
            (df[lon_col] >= bounds['lon'][0]) &
            (df[lon_col] <= bounds['lon'][1])
        )
        filtered = df[mask].copy()
        
        logger.info(f"Filtered to {len(filtered)} reports in {region}")
        return filtered
    
    def calculate_center_of_mass(
        self,
        df: pd.DataFrame,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude',
        weight_col: Optional[str] = None
    ) -> Tuple[float, float]:
        if weight_col and weight_col in df.columns:
            weights = df[weight_col].values
            center_lat = float(np.average(df[lat_col].values, weights=weights))
            center_lon = float(np.average(df[lon_col].values, weights=weights))
        else:
            center_lat = float(df[lat_col].mean())
            center_lon = float(df[lon_col].mean())
        
        return center_lat, center_lon
    
    def spatial_join(
        self,
        df1: pd.DataFrame,
        df2: pd.DataFrame,
        max_distance_km: float = 5,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude',
        use_kdtree: bool = True
    ) -> pd.DataFrame:
        logger.info(f"Performing spatial join with {max_distance_km}km threshold")
        
        if use_kdtree and len(df1) > 10 and len(df2) > 10:
            return self._spatial_join_kdtree(df1, df2, max_distance_km, lat_col, lon_col)
        else:
            return self._spatial_join_naive(df1, df2, max_distance_km, lat_col, lon_col)
    
    def _spatial_join_kdtree(
        self,
        df1: pd.DataFrame,
        df2: pd.DataFrame,
        max_distance_km: float,
        lat_col: str,
        lon_col: str
    ) -> pd.DataFrame:
        coords2_rad = np.column_stack([
            np.radians(df2[lat_col].values),
            np.radians(df2[lon_col].values)
        ])
        tree = cKDTree(coords2_rad)
        coords1_rad = np.column_stack([
            np.radians(df1[lat_col].values),
            np.radians(df1[lon_col].values)
        ])
        
        radius_rad = max_distance_km / self.earth_radius_km
        
        results = []
        for i, coord1 in enumerate(coords1_rad):
            indices = tree.query_ball_point(coord1, radius_rad)
            
            for j in indices:
                distance = self.haversine_distance(
                    df1.iloc[i][lat_col], df1.iloc[i][lon_col],
                    df2.iloc[j][lat_col], df2.iloc[j][lon_col]
                )
                
                if distance <= max_distance_km:
                    merged_row = {**df1.iloc[i].to_dict(), **df2.iloc[j].to_dict()}
                    merged_row['join_distance_km'] = distance
                    results.append(merged_row)
        
        if results:
            result_df = pd.DataFrame(results)
            logger.info(f" Spatial join complete: {len(result_df)} matches (KD-Tree)")
            return result_df
        else:
            logger.warning("No spatial matches found")
            return pd.DataFrame()
    
    def _spatial_join_naive(
        self,
        df1: pd.DataFrame,
        df2: pd.DataFrame,
        max_distance_km: float,
        lat_col: str,
        lon_col: str
    ) -> pd.DataFrame:
        results = []
        lats1 = df1[lat_col].values
        lons1 = df1[lon_col].values
        lats2 = df2[lat_col].values
        lons2 = df2[lon_col].values
        
        for i in range(len(df1)):
            distances = self.haversine_distance_vectorized(
                lats1[i], lons1[i],
                lats2, lons2,
                self.earth_radius_km
            )
            matches = np.where(distances <= max_distance_km)[0]
            
            for j in matches:
                merged_row = {**df1.iloc[i].to_dict(), **df2.iloc[j].to_dict()}
                merged_row['join_distance_km'] = float(distances[j])
                results.append(merged_row)
        
        if results:
            result_df = pd.DataFrame(results)
            logger.info(f" Spatial join complete: {len(result_df)} matches")
            return result_df
        else:
            logger.warning("No spatial matches found")
            return pd.DataFrame()
    
    def cluster_nearby_points(
        self,
        df: pd.DataFrame,
        max_distance_km: float = 5,
        lat_col: str = 'latitude',
        lon_col: str = 'longitude',
        min_cluster_size: int = 2
    ) -> pd.DataFrame:
        from sklearn.cluster import DBSCAN
        coords = np.column_stack([
            np.radians(df[lat_col].values),
            np.radians(df[lon_col].values)
        ])
        
        # DBSCAN clustering
        eps_rad = max_distance_km / self.earth_radius_km
        clustering = DBSCAN(
            eps=eps_rad,
            min_samples=min_cluster_size,
            metric='euclidean'  
        ).fit(coords)
        
        df = df.copy()
        df['cluster_id'] = clustering.labels_
        
        n_clusters = len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0)
        logger.info(f"Detected {n_clusters} clusters")
        
        return df

def benchmark_performance(n_points: int = 1000):
    import time
    np.random.seed(42)
    test_df = pd.DataFrame({
        'latitude': np.random.uniform(8, 28, n_points),
        'longitude': np.random.uniform(68, 97, n_points),
    })
    
    analyzer = GeospatialAnalyzer(use_kdtree=True)
    
    print(f"\n")
    print(f"\n")
    print(f"PERFORMANCE BENCHMARK ({n_points} points)")
    print(f"\n")
    print(f"\n")
    
    print("1. Distance Calculation (1000 distances)")
    center_lat, center_lon = 19.076, 72.877
    
    start = time.time()
    distances_vec = analyzer.haversine_distance_vectorized(
        center_lat, center_lon,
        test_df['latitude'].values[:1000],
        test_df['longitude'].values[:1000]
    )
    vec_time = time.time() - start
    print(f"   Vectorized: {vec_time*1000:.2f}ms")
    
    print("\n2. Find Nearby Reports (50km radius)")
    
    start = time.time()
    nearby_vec = analyzer._find_nearby_vectorized(test_df, center_lat, center_lon, 50)
    vec_time = time.time() - start
    print(f"   Vectorized: {vec_time*1000:.2f}ms ({len(nearby_vec)} found)")
    
    if n_points >= 100:
        start = time.time()
        nearby_kd = analyzer._find_nearby_kdtree(test_df, center_lat, center_lon, 50)
        kd_time = time.time() - start
        print(f"   KD-Tree: {kd_time*1000:.2f}ms ({len(nearby_kd)} found)")
        print(f"   Speedup: {vec_time/kd_time:.1f}x")
    
    if n_points <= 500:  
        print("\n3. Density Calculation")
        
        sample = test_df.head(100)
        
        start = time.time()
        density_kd = analyzer._calculate_density_kdtree(sample, 20, 'latitude', 'longitude')
        kd_time = time.time() - start
        print(f"   KD-Tree: {kd_time*1000:.2f}ms")
        
        start = time.time()
        density_vec = analyzer._calculate_density_vectorized(sample, 20, 'latitude', 'longitude')
        vec_time = time.time() - start
        print(f"   Vectorized: {vec_time*1000:.2f}ms")
        print(f"   Speedup: {vec_time/kd_time:.1f}x")
    
    print(f"\n")
    print(f"\n")
    print(f"\n")
    print("✓ Benchmark complete")
    print(f"\n")
    print(f"\n")
    print(f"\n")


if __name__ == "__main__":
    from config.settings import settings
    try:
        df = pd.read_csv(settings.PROCESSED_DATA_DIR / 'social_media_test_enhanced.csv')
        print(f"Loaded {len(df)} records")
    except:
        print("Test file not found, generating synthetic data...")
        np.random.seed(42)
        df = pd.DataFrame({
            'latitude': np.random.uniform(8, 28, 200),
            'longitude': np.random.uniform(68, 97, 200),
            'text': ['test'] * 200
        })
    
    analyzer = GeospatialAnalyzer(use_kdtree=True)
    print(f"\n")
    print(f"\n")
    print("TEST 1: Finding nearby reports (Mumbai)")
    print(f"\n")
    print(f"\n")
    mumbai_lat, mumbai_lon = 19.0760, 72.8777
    
    import time
    start = time.time()
    nearby = analyzer.find_nearby_reports(df, mumbai_lat, mumbai_lon, radius_km=50)
    elapsed = time.time() - start
    
    print(f"Found {len(nearby)} reports within 50km of Mumbai")
    print(f"Time: {elapsed*1000:.2f}ms")
    if len(nearby) > 0:
        print(f"Closest report: {nearby.iloc[0]['distance_km']:.2f} km away")
    
    print(f"\n")
    print("TEST 2: Creating grid cells ")
    print(f"\n")
    start = time.time()
    df_gridded = analyzer.create_grid_cells(df, cell_size_km=10)
    elapsed = time.time() - start
    
    print(f"Created {df_gridded['grid_id'].nunique()} unique grid cells")
    print(f"Time: {elapsed*1000:.2f}ms")
    print("\nTop 5 grid cells by report count:")
    print(df_gridded['grid_id'].value_counts().head())
    

    print(f"\n")
    print(f"\n")
    print("TEST 3: Calculating density")
    print(f"\n")
    print(f"\n")
    sample = df.head(50)
    
    start = time.time()
    sample_with_density = analyzer.calculate_density(sample, radius_km=20, use_kdtree=True)
    elapsed = time.time() - start
    
    print(f"Calculated density for {len(sample)} points")
    print(f"Time: {elapsed*1000:.2f}ms ({elapsed*1000/len(sample):.2f}ms per point)")
    print("\nDensity statistics:")
    print(sample_with_density[['latitude', 'longitude', 'report_density']].head())
    

    print(f"\n")
    print(f"\n")
    print(f"\n")
    print("TEST 4: Calculating bounding box")
    print("="*80)
    print("="*80)
    print("="*80)
    bbox = analyzer.get_bounding_box(df)
    print(f"Bounding box:")
    print(f"  Latitude:  {bbox['min_lat']:.2f} to {bbox['max_lat']:.2f}")
    print(f"  Longitude: {bbox['min_lon']:.2f} to {bbox['max_lon']:.2f}")
    print(f"  Center:    ({bbox['center_lat']:.2f}, {bbox['center_lon']:.2f})")
    
    print(f"\n")
    print(f"\n")
    print(f"\n")
    print("TEST 5: Filtering by region")
    print(f"\n")
    print(f"\n")
    print(f"\n")
    west_coast = analyzer.filter_by_region(df, 'west_coast')
    east_coast = analyzer.filter_by_region(df, 'east_coast')
    print(f"West coast reports: {len(west_coast)}")
    print(f"East coast reports: {len(east_coast)}")
    
    print(f"\n")
    print(f"\n")
    print("RUNNING PERFORMANCE BENCHMARKS")
    print(f"\n")
    print(f"\n")
    benchmark_performance(n_points=1000)