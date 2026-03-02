import boto3
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-east-1"
)

MODEL_ID = "us.amazon.nova-micro-v1:0"

def _invoke(prompt: str, max_tokens: int = 500) -> str:
    response = bedrock.invoke_model(
        modelId=MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps({
            "messages": [{"role": "user", "content": [{"text": prompt}]}],
            "inferenceConfig": {"maxTokens": max_tokens}  # ← was maxNewTokens
        })
    )
    result = json.loads(response["body"].read())
    return result["output"]["message"]["content"][0]["text"]


def analyze_report_cluster(cluster_data: dict) -> dict:
    reports_text = "\n".join([
        f"- Report {i+1}: \"{r['description']}\" "
        f"[Severity: {r['severity']}, "
        f"Has photo: {'Yes' if r.get('has_image') else 'No'}, "
        f"Time: {r.get('time', 'Unknown')}]"
        for i, r in enumerate(cluster_data.get("reports", []))
    ])

    prompt = f"""You are an AI for Indian coastal disaster management (Tat-Sahayk platform).
Analyze these {cluster_data['report_count']} citizen reports from {cluster_data.get('district','Unknown')} 
about a possible {cluster_data['hazard_type']} near {cluster_data['location']}.

REPORTS:
{reports_text}

Respond ONLY with a JSON object, no extra text:
{{
  "authenticity_score": <float 0.0-1.0>,
  "severity_recommendation": "<low|medium|high|critical>",
  "summary": "<2-3 sentence summary of what is likely happening>",
  "admin_action": "<one sentence recommended action for the district admin>"
}}

Scoring guide:
- 0.8-1.0: Multiple consistent reports, photos present, specific details
- 0.5-0.8: Consistent but vague or few photos
- 0.3-0.5: Mixed signals or very few reports
- 0.0-0.3: Likely fake, spam, or nonsensical"""

    try:
        text = _invoke(prompt, max_tokens=300)
        # Strip markdown code fences if model adds them
        text = text.strip().strip("```json").strip("```").strip()
        result = json.loads(text)
        return {
            "authenticity_score":    float(result.get("authenticity_score", 0.5)),
            "severity_recommendation": result.get("severity_recommendation", "medium"),
            "summary":               result.get("summary", "AI analysis unavailable"),
            "admin_action":          result.get("admin_action", "Review manually"),
            "model_used":            MODEL_ID,
        }
    except json.JSONDecodeError:
        logger.error(f"Nova returned non-JSON: {text}")
        return _fallback_analysis(cluster_data)
    except Exception as e:
        logger.error(f"Bedrock error: {e}")
        return _fallback_analysis(cluster_data)


def analyze_single_report(description: str, hazard_type: str, has_image: bool) -> dict:
    prompt = f"""You are an AI for Indian coastal disaster management.
A citizen submitted a {hazard_type} report: "{description}"
{"A photo was included." if has_image else "No photo provided."}

Respond ONLY with JSON, no extra text:
{{
  "authenticity_score": <float 0.0-1.0>,
  "preliminary_summary": "<one sentence assessment>"
}}"""

    try:
        text = _invoke(prompt, max_tokens=100)
        text = text.strip().strip("```json").strip("```").strip()
        result = json.loads(text)
        return {
            "authenticity_score":   float(result.get("authenticity_score", 0.5)),
            "preliminary_summary":  result.get("preliminary_summary", "Awaiting analysis"),
        }
    except Exception as e:
        logger.error(f"Single report analysis failed: {e}")
        return {"authenticity_score": 0.5, "preliminary_summary": "Awaiting cluster analysis"}


def _fallback_analysis(cluster_data: dict) -> dict:
    """Rule-based fallback when Bedrock is unavailable."""
    reports   = cluster_data.get("reports", [])
    count     = len(reports)
    has_images = sum(1 for r in reports if r.get("has_image"))
    score     = min(0.4 + (count * 0.05) + (has_images * 0.1), 0.85)
    return {
        "authenticity_score":     round(score, 2),
        "severity_recommendation": "medium",
        "summary":                f"{count} reports received about {cluster_data.get('hazard_type')}. Manual review recommended.",
        "admin_action":           "Review individual reports and verify with ground teams.",
        "model_used":             "fallback",
    }