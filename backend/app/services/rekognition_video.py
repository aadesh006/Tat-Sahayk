import boto3
import time
import logging
from typing import Dict, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

rekognition = boto3.client(
    'rekognition',
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

# Disaster-related labels to look for
DISASTER_LABELS = {
    'flood': ['Water', 'Flood', 'Rain', 'Storm', 'River', 'Ocean', 'Submerged'],
    'fire': ['Fire', 'Smoke', 'Flame', 'Burning', 'Ash', 'Explosion'],
    'cyclone': ['Storm', 'Wind', 'Tornado', 'Hurricane', 'Cyclone', 'Cloud'],
    'earthquake': ['Rubble', 'Debris', 'Collapsed', 'Damage', 'Destruction', 'Crack'],
    'tsunami': ['Wave', 'Ocean', 'Water', 'Flood', 'Coast', 'Beach'],
    'landslide': ['Mud', 'Soil', 'Rock', 'Debris', 'Mountain', 'Hill'],
    'oil_spill': ['Oil', 'Water', 'Ocean', 'Pollution', 'Spill'],
}

IRRELEVANT_LABELS = [
    'Person', 'Face', 'Selfie', 'Indoor', 'Room', 'Furniture', 
    'Food', 'Meal', 'Laptop', 'Computer', 'Phone', 'Screen',
    'Text', 'Document', 'Book', 'Clothing', 'Fashion'
]


def analyze_video_for_disaster(s3_bucket: str, s3_key: str, hazard_type: str, lat: float, lon: float, state: str = None, max_wait_seconds: int = 300) -> Dict:
    """
    Analyze video using AWS Rekognition with contextual verification.
    Combines visual analysis with weather, seasonal, and news data.
    
    Args:
        s3_bucket: S3 bucket name where video is stored
        s3_key: S3 object key (path) to the video
        hazard_type: Expected disaster type (flood, fire, etc.)
        lat: Latitude of report location
        lon: Longitude of report location
        state: State/region for news checking
        max_wait_seconds: Maximum time to wait for analysis (default 5 minutes)
    
    Returns:
        Dictionary with authenticity analysis results including contextual verification
    """
    from app.services.context_verifier import (
        check_weather_context,
        check_seasonal_context,
        check_news_context,
        calculate_combined_score
    )
    
    # Run contextual checks first (fast, don't wait for video processing)
    logger.info(f"Running contextual verification for video: {hazard_type} at ({lat}, {lon})")
    
    weather_ctx = check_weather_context(lat, lon, hazard_type)
    season_ctx = check_seasonal_context(hazard_type)
    news_ctx = check_news_context(lat, lon, hazard_type, state)
    
    logger.info(f"Context checks: Weather={weather_ctx['weather_score']}, Season={season_ctx['season_score']}, News={news_ctx['news_score']}")
    
    try:
        # Start label detection job
        logger.info(f"Starting Rekognition video analysis for {s3_key}")
        response = rekognition.start_label_detection(
            Video={
                'S3Object': {
                    'Bucket': s3_bucket,
                    'Name': s3_key
                }
            },
            MinConfidence=60.0,  # Only return labels with 60%+ confidence
            Features=['GENERAL_LABELS']
        )
        
        job_id = response['JobId']
        logger.info(f"Rekognition job started: {job_id}")
        
        # Poll for completion
        elapsed = 0
        poll_interval = 5  # Check every 5 seconds
        
        while elapsed < max_wait_seconds:
            time.sleep(poll_interval)
            elapsed += poll_interval
            
            result = rekognition.get_label_detection(JobId=job_id)
            status = result['JobStatus']
            
            if status == 'SUCCEEDED':
                logger.info(f"Rekognition job completed: {job_id}")
                return _process_rekognition_results_with_context(
                    result, hazard_type, weather_ctx, season_ctx, news_ctx
                )
            elif status == 'FAILED':
                logger.error(f"Rekognition job failed: {job_id}")
                return _default_video_response_with_context(
                    "Video analysis failed", weather_ctx, season_ctx, news_ctx
                )
            
            logger.debug(f"Rekognition job {job_id} still in progress... ({elapsed}s)")
        
        # Timeout
        logger.warning(f"Rekognition job {job_id} timed out after {max_wait_seconds}s")
        return _default_video_response_with_context(
            "Video analysis timed out - manual review required",
            weather_ctx, season_ctx, news_ctx
        )
        
    except Exception as e:
        logger.error(f"Error analyzing video with Rekognition: {e}")
        return _default_video_response_with_context(
            f"Video analysis error: {str(e)}",
            weather_ctx, season_ctx, news_ctx
        )


def _process_rekognition_results_with_context(result: Dict, hazard_type: str, weather_ctx: Dict, season_ctx: Dict, news_ctx: Dict) -> Dict:
    """Process Rekognition results and combine with contextual verification."""
    from app.services.context_verifier import calculate_combined_score
    
    labels = result.get('Labels', [])
    
    if not labels:
        # No visual content detected - rely on context
        context_score = (
            weather_ctx["weather_score"] * 0.4 +
            season_ctx["season_score"] * 0.3 +
            news_ctx["news_score"] * 0.3
        )
        
        final_score, status, summary = calculate_combined_score(
            visual_score=0.3,
            weather_ctx=weather_ctx,
            season_ctx=season_ctx,
            news_ctx=news_ctx,
            is_fake=False,
            is_relevant=False,
            location_plausible=True,
            hazard_type=hazard_type
        )
        
        return {
            "is_disaster_relevant": False,
            "relevance_reason": "No recognizable content detected in video",
            "is_fake": False,
            "fake_reason": None,
            "location_plausible": True,
            "location_reason": "Unable to verify location from video",
            "authenticity_score": final_score,
            "summary": summary
        }
    
    # Extract unique label names with their max confidence
    label_confidences = {}
    for label_data in labels:
        label_name = label_data['Label']['Name']
        confidence = label_data['Label']['Confidence']
        
        if label_name not in label_confidences or confidence > label_confidences[label_name]:
            label_confidences[label_name] = confidence
    
    detected_labels = set(label_confidences.keys())
    logger.info(f"Detected labels: {detected_labels}")
    
    # Check for irrelevant content
    irrelevant_matches = detected_labels.intersection(IRRELEVANT_LABELS)
    if len(irrelevant_matches) >= 3:
        final_score, status, summary = calculate_combined_score(
            visual_score=0.1,
            weather_ctx=weather_ctx,
            season_ctx=season_ctx,
            news_ctx=news_ctx,
            is_fake=False,
            is_relevant=False,
            location_plausible=True,
            hazard_type=hazard_type
        )
        
        return {
            "is_disaster_relevant": False,
            "relevance_reason": f"Video shows non-disaster content: {', '.join(list(irrelevant_matches)[:3])}",
            "is_fake": False,
            "fake_reason": None,
            "location_plausible": True,
            "location_reason": "Not applicable",
            "authenticity_score": final_score,
            "summary": summary
        }
    
    # Check for disaster-related labels
    hazard_keywords = DISASTER_LABELS.get(hazard_type.lower(), [])
    disaster_matches = []
    max_confidence = 0.0
    
    for label in detected_labels:
        # Check if label matches expected hazard type
        if any(keyword.lower() in label.lower() for keyword in hazard_keywords):
            confidence = label_confidences[label]
            disaster_matches.append((label, confidence))
            max_confidence = max(max_confidence, confidence)
    
    # Also check for general disaster indicators
    general_disaster_labels = ['Damage', 'Destruction', 'Emergency', 'Disaster', 'Rescue', 'Evacuation']
    for label in detected_labels:
        if label in general_disaster_labels:
            confidence = label_confidences[label]
            disaster_matches.append((label, confidence))
            max_confidence = max(max_confidence, confidence)
    
    # Calculate visual score
    if not disaster_matches:
        visual_score = 0.25
        is_relevant = False
    else:
        num_matches = len(disaster_matches)
        avg_confidence = sum(conf for _, conf in disaster_matches) / num_matches
        
        # Base score from confidence (0.5 to 0.9 range)
        visual_score = 0.5 + (avg_confidence / 100.0) * 0.4
        
        # Bonus for multiple matching labels
        if num_matches >= 3:
            visual_score += 0.1
        elif num_matches >= 2:
            visual_score += 0.05
        
        visual_score = min(0.95, visual_score)
        is_relevant = True
    
    # Combine with contextual verification
    final_score, status, summary = calculate_combined_score(
        visual_score=visual_score,
        weather_ctx=weather_ctx,
        season_ctx=season_ctx,
        news_ctx=news_ctx,
        is_fake=False,
        is_relevant=is_relevant,
        location_plausible=True,
        hazard_type=hazard_type
    )
    
    matched_labels_str = ', '.join([f"{label} ({conf:.0f}%)" for label, conf in disaster_matches[:5]]) if disaster_matches else "None"
    
    return {
        "is_disaster_relevant": is_relevant,
        "relevance_reason": f"Video shows {hazard_type}-related content: {matched_labels_str}" if is_relevant else f"No {hazard_type} indicators detected",
        "is_fake": False,
        "fake_reason": None,
        "location_plausible": True,
        "location_reason": "Location verification requires manual review",
        "authenticity_score": final_score,
        "summary": summary
    }


def _default_video_response_with_context(message: str, weather_ctx: Dict, season_ctx: Dict, news_ctx: Dict) -> Dict:
    """Return default response with contextual verification when video analysis cannot be completed."""
    from app.services.context_verifier import calculate_combined_score
    
    # Use context-only score
    final_score, status, summary = calculate_combined_score(
        visual_score=0.5,
        weather_ctx=weather_ctx,
        season_ctx=season_ctx,
        news_ctx=news_ctx,
        is_fake=False,
        is_relevant=True,
        location_plausible=True,
        hazard_type="Unknown"
    )
    
    return {
        "is_disaster_relevant": True,
        "relevance_reason": message,
        "is_fake": False,
        "fake_reason": None,
        "location_plausible": True,
        "location_reason": "Unable to verify from video",
        "authenticity_score": final_score,
        "summary": f"{message} | {summary}"
    }


def extract_s3_info_from_url(url: str) -> Optional[tuple]:
    """
    Extract S3 bucket and key from S3 URL.
    
    Supports formats:
    - https://bucket-name.s3.region.amazonaws.com/path/to/file.mp4
    - https://s3.region.amazonaws.com/bucket-name/path/to/file.mp4
    - https://bucket-name.s3.amazonaws.com/path/to/file.mp4
    
    Returns:
        Tuple of (bucket, key) or None if not an S3 URL
    """
    try:
        if 's3.amazonaws.com' not in url and 's3.' not in url:
            return None
        
        # Remove protocol
        url_without_protocol = url.split('://')[-1]
        
        # Format: bucket.s3.region.amazonaws.com/key or bucket.s3.amazonaws.com/key
        if '.s3.' in url_without_protocol or '.s3.amazonaws.com' in url_without_protocol:
            parts = url_without_protocol.split('/', 1)
            bucket = parts[0].split('.')[0]  # Extract bucket from subdomain
            key = parts[1] if len(parts) > 1 else ''
            return (bucket, key)
        
        # Format: s3.region.amazonaws.com/bucket/key
        elif 's3.' in url_without_protocol and url_without_protocol.startswith('s3.'):
            parts = url_without_protocol.split('/', 2)
            if len(parts) >= 3:
                bucket = parts[1]
                key = parts[2]
                return (bucket, key)
        
        return None
            
    except Exception as e:
        logger.error(f"Error parsing S3 URL {url}: {e}")
        return None
