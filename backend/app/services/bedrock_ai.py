import boto3
import json
import logging
import requests
import base64

logger = logging.getLogger(__name__)

bedrock = boto3.client(service_name="bedrock-runtime", region_name="us-east-1")

NOVA_PRO_ID = "us.amazon.nova-pro-v1:0"
NOVA_MICRO_ID = "us.amazon.nova-micro-v1:0"

def fetch_media_base64(url: str):
    if not url: return None, None
    try:
        ext = url.split('.')[-1].lower().split('?')[0]  # handle S3 query params
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            b64_data = base64.b64encode(resp.content).decode('utf-8')
            fmt_map = {
                'jpg': 'jpeg', 'jpeg': 'jpeg',
                'png': 'png', 'gif': 'gif', 'webp': 'webp',
                'mp4': 'video', 'mov': 'video', 'webm': 'video'
            }
            media_type = fmt_map.get(ext, 'jpeg')
            return b64_data, media_type
    except Exception as e:
        logger.error(f"Media fetch failed: {e}")
    return None, None

def ask_forensic_vision_expert(hazard_type, lat, lon, b64_data, media_type):
    """
    Call AWS Bedrock Nova Pro for visual forensics.
    Raises exception on failure to allow graceful degradation in caller.
    """
    prompt = f"""You are a disaster verification expert for an Indian emergency response system.

A citizen submitted a report claiming: "{hazard_type}" at coordinates {lat}, {lon} (India).

Analyze the provided image and answer in this EXACT JSON format only:
{{
  "is_disaster_relevant": true,
  "relevance_reason": "one sentence",
  "is_fake": false,
  "fake_reason": null,
  "location_plausible": true,
  "location_reason": "one sentence",
  "authenticity_score": 0.0,
  "summary": "one sentence final verdict"
}}

SCORING RULES:
- Image shows NO disaster (laptop, selfie, food, fabric, unrelated) → is_disaster_relevant: false, authenticity_score: 0.05
- AI-generated artifacts or clearly fake → is_fake: true, authenticity_score: 0.10
- Disaster type impossible for that geography → location_plausible: false, authenticity_score: 0.15
- Genuine disaster image with realistic damage → authenticity_score: 0.75 to 0.95
- Only score above 0.70 if image CLEARLY shows flood, fire, earthquake damage, storm, oil spill, industrial accident

Respond ONLY with the JSON object."""

    # For videos, use AWS Rekognition instead with contextual verification
    if media_type == "video":
        logger.info(f"Video detected, using AWS Rekognition with contextual verification")
        from app.services.rekognition_video import analyze_video_for_disaster, extract_s3_info_from_url
        
        # Note: This function is called from within analyze_single_report which has
        # weather_ctx, season_ctx, news_ctx in scope, but they're not passed here.
        # For videos, we need to get the media_url from the caller.
        # This is a limitation - videos called from here won't have context.
        # Videos should be handled in analyze_single_report before calling this function.
        raise Exception("Video handling should be done in analyze_single_report, not here")
    
    img_format = media_type
    
    try:
        body = {
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": img_format,
                            "source": {
                                "bytes": b64_data
                            }
                        }
                    },
                    {
                        "text": prompt
                    }
                ]
            }],
            "inferenceConfig": {
                "maxTokens": 500,
                "temperature": 0.1
            }
        }

        response = bedrock.invoke_model(
            modelId=NOVA_PRO_ID,
            body=json.dumps(body)
        )
        
        result = json.loads(response["body"].read())
        
        # Nova response format
        text = result["output"]["message"]["content"][0]["text"].strip()
        text = text.replace("```json", "").replace("```", "").strip()
        
        parsed_result = json.loads(text)
        
        # Validate required fields
        required_fields = ["is_disaster_relevant", "is_fake", "location_plausible", "authenticity_score", "summary"]
        for field in required_fields:
            if field not in parsed_result:
                raise ValueError(f"Missing required field in Bedrock response: {field}")
        
        return parsed_result
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Bedrock JSON response: {e}")
        raise Exception(f"Bedrock returned invalid JSON: {str(e)}")
    except KeyError as e:
        logger.error(f"Unexpected Bedrock response format: {e}")
        raise Exception(f"Bedrock response format error: {str(e)}")
    except Exception as e:
        logger.error(f"Bedrock API call failed: {e}")
        raise  # Re-raise to allow caller to handle

def analyze_single_report(description, hazard_type, media_url, lat, lon, state=None):
    """
    Multi-layered disaster report verification combining:
    1. Real-time weather data
    2. Seasonal patterns
    3. News corroboration
    4. Visual forensics (Nova Pro)
    
    Gracefully degrades to context-only scoring if visual analysis fails.
    """
    from app.services.context_verifier import (
        check_weather_context,
        check_seasonal_context,
        check_news_context,
        calculate_combined_score
    )
    
    # Initialize context variables outside try block so they're available in except
    weather_ctx = None
    season_ctx = None
    news_ctx = None
    context_score = 0.5
    
    try:
        # --- Layer 1: Context checks (run even without image) ---
        logger.info(f"Running contextual verification for {hazard_type} at ({lat}, {lon})")
        
        weather_ctx = check_weather_context(lat, lon, hazard_type)
        season_ctx = check_seasonal_context(hazard_type)
        news_ctx = check_news_context(lat, lon, hazard_type, state)
        
        logger.info(f"Context checks: Weather={weather_ctx['weather_score']}, Season={season_ctx['season_score']}, News={news_ctx['news_score']}")
        
        # Base context score (average of the three)
        context_score = (
            weather_ctx["weather_score"] * 0.4 +
            season_ctx["season_score"] * 0.3 +
            news_ctx["news_score"] * 0.3
        )
        
        if not media_url:
            # No image — rely on context only with penalty
            final_score = context_score * 0.6  # penalize no image
            summary = f"No image provided. Context: {weather_ctx['note']} | {season_ctx['note']} | {news_ctx['note']}"
            return {
                "authenticity_score": round(final_score, 2),
                "preliminary_summary": summary,
                "recommended_status": "pending" if final_score > 0.3 else "false"
            }
        
        # --- Layer 2: Visual forensics ---
        logger.info(f"Fetching media from {media_url}")
        b64_data, media_type = fetch_media_base64(media_url)
        
        if not b64_data:
            final_score = context_score * 0.5
            summary = f"Image fetch failed. Context score only: {weather_ctx['note']} | {season_ctx['note']}"
            return {
                "authenticity_score": round(final_score, 2),
                "preliminary_summary": summary,
                "recommended_status": "pending"
            }
        
        # Handle videos separately (Rekognition instead of Bedrock)
        if media_type == "video":
            logger.info(f"Video detected, using AWS Rekognition with contextual verification")
            try:
                from app.services.rekognition_video import analyze_video_for_disaster, extract_s3_info_from_url
                
                # Extract S3 info from media URL
                s3_info = extract_s3_info_from_url(media_url)
                if s3_info:
                    bucket, key = s3_info
                    video_result = analyze_video_for_disaster(bucket, key, hazard_type, lat, lon, state)
                    
                    # Video analysis already includes contextual verification
                    return {
                        "authenticity_score": video_result.get("authenticity_score", 0.5),
                        "preliminary_summary": video_result.get("summary", "Video analysis complete"),
                        "recommended_status": "pending" if video_result.get("authenticity_score", 0.5) > 0.25 else "false"
                    }
                else:
                    logger.warning(f"Could not extract S3 info from video URL: {media_url}")
                    # Fall back to context-only score
                    final_score = context_score * 0.5
                    summary = f"Video URL format not supported. Context: {weather_ctx['note']} | {season_ctx['note']} | {news_ctx['note']}"
                    return {
                        "authenticity_score": round(final_score, 2),
                        "preliminary_summary": summary,
                        "recommended_status": "pending"
                    }
            except Exception as video_error:
                logger.error(f"Video analysis failed: {video_error}", exc_info=True)
                # Fall back to context-only score
                final_score = context_score * 0.6
                summary = f"Video analysis failed. Context: {weather_ctx['note']} | {season_ctx['note']} | {news_ctx['note']}"
                return {
                    "authenticity_score": round(final_score, 2),
                    "preliminary_summary": summary,
                    "recommended_status": "pending"
                }
        
        # For images, use Bedrock Nova Pro
        logger.info(f"Running visual forensics with Nova Pro")
        
        # Wrap visual analysis in try-catch for graceful degradation
        try:
            vision = ask_forensic_vision_expert(hazard_type, lat, lon, b64_data, media_type)
            
            visual_score = vision.get("authenticity_score", 0.3)
            is_fake = vision.get("is_fake", False)
            is_relevant = vision.get("is_disaster_relevant", True)
            location_plausible = vision.get("location_plausible", True)
            
            logger.info(f"Visual analysis: score={visual_score}, fake={is_fake}, relevant={is_relevant}, location_ok={location_plausible}")
            
            # --- Layer 3: Combined weighted score ---
            final_score, status, summary = calculate_combined_score(
                visual_score=visual_score,
                weather_ctx=weather_ctx,
                season_ctx=season_ctx,
                news_ctx=news_ctx,
                is_fake=is_fake,
                is_relevant=is_relevant,
                location_plausible=location_plausible,
                hazard_type=hazard_type
            )
            
            logger.info(f"Final authenticity score: {final_score} ({status})")
            
            return {
                "authenticity_score": final_score,
                "preliminary_summary": summary,
                "recommended_status": status
            }
            
        except Exception as visual_error:
            # Visual analysis failed - fall back to context-only scoring
            logger.error(f"Visual analysis failed: {visual_error}", exc_info=True)
            logger.info("Falling back to context-only scoring")
            
            # Use context score with penalty for missing visual verification
            final_score = context_score * 0.6  # 40% penalty for no visual
            
            # Build summary with context details
            summary_parts = [
                "Visual analysis unavailable (Bedrock error)",
                weather_ctx['note'],
                season_ctx['note'],
                news_ctx['note']
            ]
            summary = " | ".join(summary_parts)
            
            # Determine status based on context score
            if final_score < 0.25:
                status = "false"
            elif final_score < 0.50:
                status = "pending"
            else:
                status = "pending"  # Always require review without visual
            
            logger.info(f"Context-only score: {final_score} ({status})")
            
            return {
                "authenticity_score": round(final_score, 2),
                "preliminary_summary": summary,
                "recommended_status": status
            }
    
    except Exception as e:
        # Catastrophic failure - even context checks failed
        logger.error(f"Complete analysis failure: {e}", exc_info=True)
        
        # Return minimal safe score
        return {
            "authenticity_score": 0.3,
            "preliminary_summary": f"Analysis system error: {str(e)} — manual review required",
            "recommended_status": "pending"
        }
        if not is_relevant or is_fake or score < 0.25:
            status = "false"
        elif score < 0.50 or not location_plausible:
            status = "pending"   # needs human review
        else:
            status = "pending"   # still needs admin confirm, but high confidence

        return {
            "authenticity_score": score,
            "preliminary_summary": summary,
            "recommended_status": status
        }

    except Exception as e:
        print(f"AI analysis error: {e}")
        return {
            "authenticity_score": 0.3,
            "preliminary_summary": "AI analysis failed — manual review required.",
            "recommended_status": "pending"
        }

def analyze_report_cluster(reports_data: list) -> dict:
    """Analyzes a cluster of verified reports to generate a unified situation summary."""
    if not reports_data:
        return {"cluster_summary": "No data.", "severity": "LOW", "confidence": 0.0}

    prompt = f"Analyze these {len(reports_data)} verified disaster reports from the same geographic cluster:\n"
    for r in reports_data:
        prompt += f"- Type: {r.get('hazard_type', 'Unknown')}, Desc: {r.get('description', '')}\n"

    prompt += "\nOutput ONLY JSON: {\"cluster_summary\": \"<1 paragraph synthesis>\", \"severity\": \"<LOW|MEDIUM|HIGH|CRITICAL>\", \"confidence\": <float 0.0-1.0>}"

    try:
        response = bedrock.invoke_model(
            modelId=NOVA_MICRO_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "messages": [{"role": "user", "content": [{"text": prompt}]}],
                "inferenceConfig": {"maxTokens": 200, "temperature": 0.2}
            })
        )
        res_text = json.loads(response["body"].read())["output"]["message"]["content"][0]["text"]
        return json.loads(res_text.strip("```json").strip("```").strip())
    except Exception as e:
        logger.error(f"Cluster analysis failed: {e}")
        return {"cluster_summary": "Analysis failed.", "severity": "MEDIUM", "confidence": 0.5}