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
    """Fetches media from S3 and returns base64 + media type."""
    if not url: return None, None
    try:
        ext = url.split('.')[-1].lower()
        resp = requests.get(url, stream=True, timeout=10)
        if resp.status_code == 200:
            media_bytes = resp.raw.read(15 * 1024 * 1024)
            b64_data = base64.b64encode(media_bytes).decode('utf-8')
            if ext in ['mp4', 'mov', 'webm']:
                return b64_data, 'video'
            else:
                return b64_data, 'image'
    except Exception as e:
        logger.error(f"Media fetch failed: {e}")
    return None, None

def ask_forensic_vision_expert(hazard_type: str, lat: float, lon: float, b64_data: str, media_type: str) -> dict:
    """Nova Pro analyzes the media for deepfakes, old footage, and location mismatches."""
    if not b64_data:
        return {"score": 0.5, "reasoning": "No media provided."}

    if media_type == 'video':
        media_block = {"video": {"format": "mp4", "source": {"bytes": b64_data}}}
    else:
        media_block = {"image": {"format": "jpeg", "source": {"bytes": b64_data}}}

    prompt = f"""You are a Digital Forensic Analyst for a disaster management system.
A user reported a '{hazard_type}' at coordinates {lat}°N, {lon}°E.

Analyze the attached media and check for:
1. AI Generation: Deepfake artifacts, weird physics, inconsistent lighting.
2. Dated Footage: Does this look like recycled/old viral footage?
3. Location Mismatch: Does the terrain/weather contradict the coordinates ({lat}°N, {lon}°E)?

Respond ONLY with a JSON object:
{{
  "is_fake": <boolean true or false>,
  "score": <float 0.0-1.0>,
  "reasoning": "<1-2 sentence forensic justification>"
}}"""

    try:
        response = bedrock.invoke_model(
            modelId=NOVA_PRO_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "messages": [{"role": "user", "content": [media_block, {"text": prompt}]}],
                "inferenceConfig": {"maxTokens": 200, "temperature": 0.1}
            })
        )
        res_text = json.loads(response["body"].read())["output"]["message"]["content"][0]["text"]
        return json.loads(res_text.strip("```json").strip("```").strip())
    except Exception as e:
        logger.error(f"Forensic expert failed: {e}")
        return {"is_fake": False, "score": 0.5, "reasoning": "Forensic analysis failed."}

def analyze_single_report(description: str, hazard_type: str, media_url: str, lat: float, lon: float) -> dict:
    """Runs media forensics and text plausibility."""
    b64_data, media_type = fetch_media_base64(media_url)
    
    forensic_data = ask_forensic_vision_expert(hazard_type, lat, lon, b64_data, media_type)
    
    final_score = forensic_data.get("score", 0.5)
    is_fake = forensic_data.get("is_fake", False)
    
    if is_fake or final_score < 0.3:
        status = "false"
        summary = f"AUTO-REJECTED (Fake/Mismatch): {forensic_data.get('reasoning')}"
    else:
        status = "pending"
        summary = f"PASSED FORENSICS [{final_score*100:.0f}%]: {forensic_data.get('reasoning')}"
        
    return {
        "authenticity_score": round(final_score, 2),
        "preliminary_summary": summary,
        "recommended_status": status
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