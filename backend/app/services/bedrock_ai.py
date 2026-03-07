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

    # Nova Pro image format — different from Anthropic Claude
    img_format = media_type if media_type != "video" else "jpeg"
    
    body = {
        "messages": [{
            "role": "user",
            "content": [
                {
                    "image": {
                        "format": img_format,
                        "source": {
                            "bytes": b64_data   # Nova takes base64 string directly
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
    
    # Nova response format — different from Anthropic
    text = result["output"]["message"]["content"][0]["text"].strip()
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)

def analyze_single_report(description, hazard_type, media_url, lat, lon):
    try:
        # If no image, do a text-only plausibility check
        if not media_url:
            return {
                "authenticity_score": 0.4,
                "preliminary_summary": "No image provided — cannot verify visually.",
                "recommended_status": "pending"
            }

        b64_data, media_type = fetch_media_base64(media_url)
        vision = ask_forensic_vision_expert(hazard_type, lat, lon, b64_data, media_type)

        score = vision.get("authenticity_score", 0.3)
        is_fake = vision.get("is_fake", False)
        is_relevant = vision.get("is_disaster_relevant", True)
        location_plausible = vision.get("location_plausible", True)

        # Build human-readable summary
        flags = []
        if not is_relevant:
            flags.append("image does not show a disaster")
        if is_fake:
            flags.append("possible AI-generated or recycled image")
        if not location_plausible:
            flags.append("disaster type doesn't match location geography")

        if flags:
            summary = f"FLAGGED [{int(score*100)}%]: {', '.join(flags).capitalize()}. {vision.get('summary','')}"
        else:
            summary = f"PASSED FORENSICS [{int(score*100)}%]: {vision.get('summary','')}"

        # Determine status
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