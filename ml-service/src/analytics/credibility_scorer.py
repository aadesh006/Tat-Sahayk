import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import logging
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))
from config.settings import settings

logger = logging.getLogger(__name__)

class CredibilityScorer:
    
    def __init__(self):
        self.weights = {
            'has_location': 0.15,
            'location_specificity': 0.10,
            'has_media': 0.15,
            'media_count': 0.05,
            'engagement_score': 0.10,
            'share_ratio': 0.05,
            'author_followers': 0.10,
            'is_verified_account': 0.05,
            'text_quality': 0.10,
            'has_details': 0.05,
            'hazard_sentiment_match': 0.05,
            'urgency_consistency': 0.05
        }
        self.high_credibility_threshold = 0.7
        self.medium_credibility_threshold = 0.5
        
        logger.info("CredibilityScorer initialized")
    
    def score_location(self, report: pd.Series) -> float:
        score = 0.0
        
        if 'has_location_entity' in report:
            if report['has_location_entity']:
                score += self.weights['has_location']
        elif 'latitude' in report and 'longitude' in report:
            if pd.notna(report['latitude']) and pd.notna(report['longitude']):
                score += self.weights['has_location']
        
        if 'location_count' in report:
            if report['location_count'] > 0:
                score += self.weights['location_specificity']
        elif 'extracted_locations' in report:
            if pd.notna(report['extracted_locations']) and report['extracted_locations']:
                score += self.weights['location_specificity']
        
        return score
    
    def score_media(self, report: pd.Series) -> float:
        score = 0.0
        if 'has_media' in report:
            if report['has_media']:
                score += self.weights['has_media']

        if 'media_count' in report:
            media_score = min(report['media_count'] / 3, 1.0)
            score += self.weights['media_count'] * media_score
        
        return score
    
    def score_engagement(self, report: pd.Series) -> float:
        score = 0.0
        if 'total_engagement' in report:
            eng_score = min(np.log1p(report['total_engagement']) / np.log1p(1000), 1.0)
            score += self.weights['engagement_score'] * eng_score
        if 'share_ratio' in report:
            score += self.weights['share_ratio'] * report['share_ratio']
        elif all(col in report for col in ['shares', 'total_engagement']):
            if report['total_engagement'] > 0:
                share_ratio = report['shares'] / report['total_engagement']
                score += self.weights['share_ratio'] * share_ratio
        
        return score
    
    def score_author(self, report: pd.Series) -> float:
        score = 0.0
        
        if 'author_followers' in report:
            follower_score = min(np.log1p(report['author_followers']) / np.log1p(10000), 1.0)
            score += self.weights['author_followers'] * follower_score
        
        if 'is_verified_account' in report:
            if report['is_verified_account']:
                score += self.weights['is_verified_account']
        elif 'is_verified' in report:
            if report['is_verified']:
                score += self.weights['is_verified_account']
        
        return score
    
    def score_text_quality(self, report: pd.Series) -> float:
        score = 0.0
        
        if 'word_count' in report:
            word_count = report['word_count']
            if 10 <= word_count <= 100:  
                text_score = 1.0
            elif word_count < 10:  
                text_score = word_count / 10
            else:  # Too long
                text_score = max(0.5, 1.0 - (word_count - 100) / 200)
            
            score += self.weights['text_quality'] * text_score
        
        detail_score = 0.0
        if 'date_count' in report and report['date_count'] > 0:
            detail_score += 0.33
        if 'time_count' in report and report['time_count'] > 0:
            detail_score += 0.33
        if 'has_numbers' in report and report['has_numbers']:
            detail_score += 0.34
        
        score += self.weights['has_details'] * detail_score
        
        return score
    
    def score_consistency(self, report: pd.Series) -> float:
        score = 0.0
        
        if all(col in report for col in ['is_hazard', 'sentiment']):
            if report['is_hazard'] and report['sentiment'] == 'negative':
                score += self.weights['hazard_sentiment_match']
            elif not report['is_hazard'] and report['sentiment'] != 'negative':
                score += self.weights['hazard_sentiment_match'] * 0.5
        
        # Urgency matches panic level
        if all(col in report for col in ['has_urgency_words', 'predicted_panic_level']):
            if report['has_urgency_words'] and report['predicted_panic_level'] in ['high', 'critical']:
                score += self.weights['urgency_consistency']
            elif not report['has_urgency_words'] and report['predicted_panic_level'] in ['low', 'medium']:
                score += self.weights['urgency_consistency'] * 0.5
        elif all(col in report for col in ['urgency_score', 'panic_score']):
            correlation = abs(report['urgency_score'] - report['panic_score']) < 0.3
            if correlation:
                score += self.weights['urgency_consistency']
        
        return score
    
    def score_report(self, report: pd.Series) -> float:
        total_score = 0.0
        
        total_score += self.score_location(report)
        total_score += self.score_media(report)
        total_score += self.score_engagement(report)
        total_score += self.score_author(report)
        total_score += self.score_text_quality(report)
        total_score += self.score_consistency(report)
        total_score = max(0.0, min(1.0, total_score))
        
        return total_score
    
    def categorize_credibility(self, score: float) -> str:
        if score >= self.high_credibility_threshold:
            return 'high'
        elif score >= self.medium_credibility_threshold:
            return 'medium'
        else:
            return 'low'
    
    def score_batch(
        self,
        df: pd.DataFrame,
        add_category: bool = True
    ) -> pd.DataFrame:
        logger.info(f"Scoring credibility for {len(df)} reports...")
        
        df = df.copy()
        df['credibility_score'] = df.apply(self.score_report, axis=1)

        if add_category:
            df['credibility_category'] = df['credibility_score'].apply(
                self.categorize_credibility
            )
        
        logger.info(" Credibility scoring complete")
        logger.info(f"  Mean score: {df['credibility_score'].mean():.3f}")
        logger.info(f"  Median score: {df['credibility_score'].median():.3f}")
        
        if add_category:
            logger.info("\nCredibility distribution:")
            for category, count in df['credibility_category'].value_counts().items():
                logger.info(f"  {category}: {count} ({count/len(df)*100:.1f}%)")
        
        return df
    
    def score_posts(self, df: pd.DataFrame, add_category: bool = True) -> pd.DataFrame:
        return self.score_batch(df, add_category=add_category)
    
    def calculate_credibility(self, df: pd.DataFrame, add_category: bool = True) -> pd.DataFrame:
        return self.score_batch(df, add_category=add_category)

    
    def get_score_breakdown(self, report: pd.Series) -> Dict[str, float]:
        breakdown = {
            'location': self.score_location(report),
            'media': self.score_media(report),
            'engagement': self.score_engagement(report),
            'author': self.score_author(report),
            'text_quality': self.score_text_quality(report),
            'consistency': self.score_consistency(report)
        }
        
        breakdown['total'] = sum(breakdown.values())
        
        return breakdown



if __name__ == "__main__":
    from config.settings import settings
    df = pd.read_csv(settings.PROCESSED_DATA_DIR / 'social_media_test_enhanced.csv')
    
    print(f"\n")
    print("CREDIBILITY SCORING TEST")
    print(f"\n")
    print(f"\nScoring {len(df)} reports...")
    scorer = CredibilityScorer()
    df_scored = scorer.score_batch(df)
    
    print(f"\n")
    print("CREDIBILITY STATISTICS")
    print(f"\n")
    print(df_scored['credibility_score'].describe())
    
    print(f"\n")
    print("CREDIBILITY DISTRIBUTION")
    print(f"\n")
    print(df_scored['credibility_category'].value_counts())
    
    # Show top 5 most credible reports
    print(f"\n")
    print("TOP 5 MOST CREDIBLE REPORTS")
    print(f"\n")
    
    top_reports = df_scored.nlargest(5, 'credibility_score')
    
    for idx in top_reports.index:
        report = df_scored.loc[idx]
        breakdown = scorer.get_score_breakdown(report)
        
        print(f"\nReport: {report['text'][:80]}...")
        print(f"Credibility Score: {report['credibility_score']:.3f} ({report['credibility_category']})")
        print(f"Breakdown:")
        for component, score in breakdown.items():
            if component != 'total':
                print(f"  {component:15s}: {score:.3f}")
    
    print(f"\n")
    print("BOTTOM 5 LEAST CREDIBLE REPORTS")
    print(f"\n")
    
    bottom_reports = df_scored.nsmallest(5, 'credibility_score')
    
    for idx in bottom_reports.index:
        report = df_scored.loc[idx]
        print(f"\nReport: {report['text'][:80]}...")
        print(f"Credibility Score: {report['credibility_score']:.3f} ({report['credibility_category']})")
    output_path = settings.DATA_DIR / 'credibility_scored.csv'
    df_scored.to_csv(output_path, index=False)
    print(f"\n Saved scored data to {output_path}")