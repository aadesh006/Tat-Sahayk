import sys
from pathlib import Path
import pandas as pd
import json
import logging

sys.path.append(str(Path(__file__).parent.parent))

from config.settings import settings
from src.analytics.geospatial_analysis import GeospatialAnalyzer
from src.analytics.hotspot_generator import HotspotGenerator
from src.analytics.credibility_scorer import CredibilityScorer
from src.analytics.engagement_tracker import EngagementTracker
from src.analytics.trend_analyzer import TrendAnalyzer

logger = logging.getLogger(__name__)

def main():
    print(f"\n")
    print(f"\n")
    print("RUNNING ANALYTICS PIPELINE")
    print(f"\n")
    print(f"\n")
    
    print("\nLoading data")
    social_df = pd.read_csv(settings.PROCESSED_DATA_DIR / 'social_media_test_enhanced.csv')
    print(f"Loaded {len(social_df)} social media posts")
    print("\nInitializing analyzers...")
    geo_analyzer = GeospatialAnalyzer()
    hotspot_gen = HotspotGenerator()
    cred_scorer = CredibilityScorer()
    eng_tracker = EngagementTracker()
    trend_analyzer = TrendAnalyzer()
    print(f"\n")
    print(f"\n")
    print("1. CREDIBILITY SCORING")
    print(f"\n")
    social_df = cred_scorer.score_batch(social_df)
    
    print(f"\n")
    print(f"\n")
    print("2. ENGAGEMENT ANALYSIS")
    print(f"\n")
    print(f"\n")
    social_df = eng_tracker.calculate_engagement_rate(social_df)
    social_df = eng_tracker.identify_viral_content(social_df)
    
    engagement_by_hazard = eng_tracker.analyze_engagement_by_hazard(social_df)
    print("\nEngagement by Hazard Type:")
    print(engagement_by_hazard)

    print(f"\n")
    print(f"\n")
    print("3. HOTSPOT DETECTION")
    print(f"\n")
    print(f"\n")
    hazard_df = social_df[social_df['is_hazard'] == True].copy()
    print(f"Analyzing {len(hazard_df)} hazard reports")
    
    hotspots = hotspot_gen.generate_hotspots(hazard_df)
    print(f" Detected {len(hotspots)} hotspots")
    print(f"\n")
    print(f"\n")
    print("4. TREND ANALYSIS")
    print(f"\n")
    print(f"\n")
    trend = trend_analyzer.calculate_trend(hazard_df, window_hours=12)
    print(f"Trend direction: {trend}")
    
    spikes = trend_analyzer.detect_spikes(hazard_df)
    print(f"Detected {len(spikes)} spikes in activity")
    
    patterns = trend_analyzer.analyze_temporal_patterns(hazard_df)
    print(f"Busiest hour: {patterns.get('busiest_hour', 'N/A')}")
    
    print(f"\n")
    print(f"\n")
    print("SAVING RESULTS")
    print(f"\n")
    print(f"\n")
    
    output_path = settings.DATA_DIR / 'analytics_results.csv'
    social_df.to_csv(output_path, index=False)
    print(f" Saved analytics results: {output_path}")
    
    if hotspots:
        hotspots_df = hotspot_gen.create_hotspot_dataframe(hotspots)
        hotspots_path = settings.DATA_DIR / 'detected_hotspots.csv'
        hotspots_df.to_csv(hotspots_path, index=False)
        print(f"Saved hotspots: {hotspots_path}")
        
        hotspots_json_path = settings.DATA_DIR / 'detected_hotspots.json'
        with open(hotspots_json_path, 'w') as f:
            json.dump(hotspots, f, indent=2)
        print(f" Saved hotspots JSON: {hotspots_json_path}")
    
    print(f"\n")
    print(f"\n")
    print("SUMMARY STATISTICS")
    print(f"\n")
    print(f"\n")
    
    summary = {
    'total_reports': int(len(social_df)),
    'hazard_reports': int(len(hazard_df)),
    'hotspots_detected': int(len(hotspots)),
    'high_credibility_reports': int(len(social_df[social_df['credibility_category'] == 'high'])),
    'viral_posts': int(social_df['is_viral'].sum()) if 'is_viral' in social_df.columns else 0,
    'trend_direction': trend,
    'mean_credibility': float(social_df['credibility_score'].mean()),
    'mean_engagement_rate': float(social_df['engagement_rate'].mean()) if 'engagement_rate' in social_df.columns else 0
}

    
    for key, value in summary.items():
        print(f"  {key}: {value}")
    
    summary_path = settings.DATA_DIR / 'analytics_summary.json'
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"\nSaved summary: {summary_path}")
    
    print(f"\n")
    print(f"\n")
    print(" ANALYTICS COMPLETE!")
    print(f"\n")
    print(f"\n")

if __name__ == "__main__":
    main()