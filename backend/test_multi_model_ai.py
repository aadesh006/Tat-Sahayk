"""
Test script for Multi-Model AI Analysis System
Run this to verify your AWS and Tavily setup
"""

import asyncio
import sys
from app.services.multi_model_ai import MultiModelAnalyzer
from app.core.config import settings

async def test_multi_model_ai():
    print("=" * 60)
    print("Testing Multi-Model AI Analysis System")
    print("=" * 60)
    
    # Check configuration
    print("\n1. Checking Configuration...")
    print(f"   AWS Region: {settings.AWS_REGION}")
    print(f"   S3 Bucket: {settings.S3_BUCKET or 'Not configured (using Cloudinary)'}")
    print(f"   Tavily API: {'✓ Configured' if settings.TAVILY_API_KEY else '✗ Not configured (will use fallback)'}")
    
    # Create test cluster data
    test_cluster = {
        "hazard_type": "Flood",
        "location": "25.5941°N, 85.1376°E",
        "district": "Patna",
        "state": "Bihar",
        "report_count": 3,
        "reports": [
            {
                "description": "Heavy flooding in residential areas. Water level rising rapidly. Many families evacuated.",
                "severity": "high",
                "has_image": False,
                "image_url": None,
                "time": "2024-07-15T10:30:00Z"
            },
            {
                "description": "Roads completely submerged. Emergency services struggling to reach affected areas.",
                "severity": "critical",
                "has_image": False,
                "image_url": None,
                "time": "2024-07-15T11:00:00Z"
            },
            {
                "description": "Multiple buildings damaged. Requesting immediate assistance.",
                "severity": "high",
                "has_image": False,
                "image_url": None,
                "time": "2024-07-15T11:15:00Z"
            }
        ]
    }
    
    print("\n2. Running Multi-Model Analysis...")
    print(f"   Test Cluster: {test_cluster['report_count']} {test_cluster['hazard_type']} reports in {test_cluster['district']}")
    
    try:
        analyzer = MultiModelAnalyzer()
        result = await analyzer.analyze_cluster(test_cluster)
        
        print("\n3. Analysis Results:")
        print(f"   Overall Authenticity Score: {result['authenticity_score']:.0%}")
        print(f"   Severity Recommendation: {result['severity_recommendation']}")
        print(f"   Summary: {result['summary']}")
        
        print("\n4. Detailed Breakdown:")
        breakdown = result.get('analysis_breakdown', {})
        print(f"   📸 Image Authenticity:      {breakdown.get('image_authenticity', 0):.0%}")
        print(f"   📍 Location Verification:   {breakdown.get('location_verification', 0):.0%}")
        print(f"   ⏰ Temporal Consistency:    {breakdown.get('temporal_consistency', 0):.0%}")
        print(f"   📰 News Correlation:        {breakdown.get('news_correlation', 0):.0%}")
        print(f"   📝 Text Coherence:          {breakdown.get('text_coherence', 0):.0%}")
        
        print("\n" + "=" * 60)
        print("✓ Multi-Model AI System is working correctly!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error during analysis: {e}")
        print("\nTroubleshooting:")
        print("1. Check AWS credentials in .env file")
        print("2. Verify Bedrock access in your AWS account")
        print("3. Ensure Claude models are enabled in Bedrock")
        print("4. Check internet connectivity for Tavily API")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_multi_model_ai())
    sys.exit(0 if success else 1)
