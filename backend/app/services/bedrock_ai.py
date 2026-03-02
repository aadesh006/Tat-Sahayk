import boto3
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Initialize Bedrock client
bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name="ap-south-1"  # Mumbai region — closest to India
)

MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"  # Claude on Bedrock

def analyze_report_cluster(cluster_data: dict) -> dict:
    """
    Takes a cluster of reports from the same geographic area
    and returns AI-generated summary + authenticity score.
    
    cluster_data = {
        "hazard_type": "Flood",
        "location": "13.08°N, 80.27°E",
        "district": "Chennai",
        "report_count": 7,
        "reports": [
            {
                "description": "Water entering houses near marina beach",
                "severity": "high",
                "has_image": True,
                "time": "2026-03-02T14:30:00"
            },
            ...
        ]
    }
    """
    
    reports_text = "\n".join([
        f"- Report {i+1}: \"{r['description']}\" "
        f"[Severity: {r['severity']}, "
        f"Has photo: {'Yes' if r.get('has_image') else 'No'}, "
        f"Time: {r.get('time', 'Unknown')}]"
        for i, r in enumerate(cluster_data.get("reports", []))
    ])
    
    prompt = f"""You are an AI system for the Indian coastal disaster management platform Tat-Sahayk.
Analyze these {cluster_data['report_count']} citizen reports from {cluster_data['district']} 
about a possible {cluster_data['hazard_type']} incident near coordinates {cluster_data['location']}.

CITIZEN REPORTS:
{reports_text}

Analyze these reports and respond ONLY with a valid JSON object in this exact format:
{{
  "authenticity_score": <float between 0.0 and 1.0>,
  "severity_recommendation": "<low|medium|high|critical>",
  "summary": "<2-3 sentence summary of what is likely happening based on the reports>",
  "key_indicators": "<comma-separated list of specific keywords or patterns that support or contradict authenticity>",
  "admin_action": "<recommended action for the district admin in one sentence>",
  "confidence_reasoning": "<one sentence explaining why you gave this authenticity score>"
}}

Scoring guide for authenticity:
- 0.9-1.0: Multiple consistent reports with photos, specific location details, credible descriptions
- 0.7-0.9: Consistent reports but few photos or slightly vague
- 0.5-0.7: Mixed signals, some inconsistencies, or too few reports
- 0.3-0.5: Vague descriptions, inconsistent reports, suspicious patterns
- 0.0-0.3: Likely fake, coordinated spam, or nonsensical descriptions

Respond with ONLY the JSON object, no other text."""

    try:
        response = bedrock.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            })
        )
        
        result_body = json.loads(response["body"].read())
        ai_text = result_body["content"][0]["text"]
        
        # Parse the JSON response
        ai_result = json.loads(ai_text.strip())
        
        return {
            "authenticity_score": float(ai_result.get("authenticity_score", 0.5)),
            "severity_recommendation": ai_result.get("severity_recommendation", "medium"),
            "summary": ai_result.get("summary", "AI analysis unavailable"),
            "key_indicators": ai_result.get("key_indicators", ""),
            "admin_action": ai_result.get("admin_action", ""),
            "confidence_reasoning": ai_result.get("confidence_reasoning", ""),
            "model_used": MODEL_ID,
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Bedrock JSON response: {e}")
        return _fallback_analysis(cluster_data)
    except Exception as e:
        logger.error(f"Bedrock API error: {e}")
        return _fallback_analysis(cluster_data)


def analyze_single_report(description: str, hazard_type: str, has_image: bool) -> dict:
    """
    For individual reports that don't yet have a cluster.
    Gives a quick preliminary score shown immediately after submission.
    """
    prompt = f"""You are an AI for Indian coastal disaster management.
A citizen just submitted a {hazard_type} report with description: "{description}"
{"They included a photo." if has_image else "No photo was provided."}

Respond ONLY with a JSON object:
{{
  "authenticity_score": <float 0.0-1.0>,
  "preliminary_summary": "<one sentence assessment>",
  "credibility_factors": "<what makes this report credible or not>"
}}"""

    try:
        response = bedrock.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 200,
                "messages": [{"role": "user", "content": prompt}]
            })
        )
        result_body = json.loads(response["body"].read())
        ai_text = result_body["content"][0]["text"]
        return json.loads(ai_text.strip())
    except Exception as e:
        logger.error(f"Single report analysis failed: {e}")
        return {
            "authenticity_score": 0.5,
            "preliminary_summary": "Awaiting cluster analysis",
            "credibility_factors": "Insufficient data for scoring"
        }


def _fallback_analysis(cluster_data: dict) -> dict:
    """Rule-based fallback when Bedrock is unavailable."""
    reports = cluster_data.get("reports", [])
    count = len(reports)
    has_images = sum(1 for r in reports if r.get("has_image"))
    
    # Simple heuristic score
    score = min(0.4 + (count * 0.05) + (has_images * 0.1), 0.85)
    
    return {
        "authenticity_score": round(score, 2),
        "severity_recommendation": "medium",
        "summary": f"{count} citizen reports received near this location regarding {cluster_data.get('hazard_type', 'an incident')}. Manual review recommended.",
        "key_indicators": f"{has_images} reports with photos, {count} total reports",
        "admin_action": "Review individual reports and verify with ground teams.",
        "confidence_reasoning": "Fallback rule-based scoring (AI service unavailable)",
        "model_used": "fallback",
    }