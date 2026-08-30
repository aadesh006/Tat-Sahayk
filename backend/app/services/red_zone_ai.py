"""
AI services for Red Zone Management using AWS Bedrock Nova Micro.
Nova Pro is NOT used here (costs more) — Nova Micro handles text assessment well.

All AI assessments for:
- Cluster-to-Red-Zone conversion
- Habitation priority assessment
- Relocation site suitability
- SDMA executive summaries
"""
import boto3
import json
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Use us-east-1 for Bedrock (as per existing pattern)
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
NOVA_MICRO = "us.amazon.nova-micro-v1:0"

HAZARD_WEIGHTS = {
    "landslide": 0.95,
    "glacier_lake_outburst": 0.95,
    "cyclone": 0.90,
    "earthquake": 0.85,
    "coastal_erosion": 0.80,
    "tsunami": 0.90,
    "cloudburst": 0.80,
    "flood": 0.75,
    "storm": 0.70,
    "storm_surge": 0.75,
    "erosion": 0.60,
    "industrial": 0.65,
    "oil_spill": 0.60,
}

def compute_multi_hazard_score(hazard_types: list) -> float:
    """
    Compute composite risk score for multiple hazard types.
    Multi-hazard compounds: highest weight + 10% bonus per additional hazard.
    """
    if not hazard_types:
        return 0.5
    weights = [HAZARD_WEIGHTS.get(h.lower().replace(" ", "_"), 0.5) for h in hazard_types]
    base = max(weights)
    bonus = (len(weights) - 1) * 0.10
    return min(1.0, base + bonus)


def _call_nova_micro(prompt: str, max_tokens: int = 400) -> dict:
    """
    Call Nova Micro and parse JSON response.
    Handles JSON extraction from code blocks if present.
    """
    try:
        response = bedrock.invoke_model(
            modelId=NOVA_MICRO,
            body=json.dumps({
                "messages": [{"role": "user", "content": [{"text": prompt}]}],
                "inferenceConfig": {"maxTokens": max_tokens, "temperature": 0.1}
            })
        )
        result = json.loads(response["body"].read())
        text = result["output"]["message"]["content"][0]["text"].strip()
        
        # Remove code block markers if present
        text = text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"Nova Micro JSON parse error: {e}, raw text: {text[:200]}")
        return {}
    except Exception as e:
        logger.error(f"Nova Micro call failed: {e}")
        return {}


def assess_cluster_as_red_zone(cluster_data: dict) -> dict:
    """
    Given a cluster of verified reports, assess if the area qualifies as a Red Zone.
    Called by cluster_analyzer.py after cluster analysis.
    
    Args:
        cluster_data: Dict with location, district, state, hazard_type, report_count, radius_km, reports
    
    Returns:
        Dict with is_red_zone, intensity, confidence, reasoning, population_at_risk_estimate, etc.
    """
    hazard_types = cluster_data.get('hazard_types', [cluster_data.get('hazard_type', 'unknown')])
    multi_score = compute_multi_hazard_score(hazard_types)
    
    prompt = f"""You are an NDMA (National Disaster Management Authority) expert for India.

A geographic cluster of verified disaster reports has been detected:
- Location: {cluster_data.get('location', 'Unknown')}
- District: {cluster_data.get('district', 'Unknown')}, {cluster_data.get('state', 'Unknown')}
- Hazard Type: {cluster_data.get('hazard_type', 'Unknown')}
- Number of verified reports: {cluster_data.get('report_count', 0)}
- Cluster radius: {cluster_data.get('radius_km', 80)}km
- Multi-hazard composite risk score: {multi_score:.2f}
- Sample Reports: {json.dumps(cluster_data.get('reports', [])[:5])}

Assess if this area should be classified as a Hazard Red Zone requiring habitation relocation.

Consider:
1. Frequency and severity of incidents
2. Geographic concentration
3. Historical pattern (recurring vs one-time)
4. Population density in affected area
5. Feasibility of permanent mitigation measures

Output ONLY valid JSON:
{{
  "is_red_zone": true/false,
  "intensity": "low|medium|high|critical",
  "confidence": 0.0-1.0,
  "reasoning": "one paragraph explanation",
  "population_at_risk_estimate": 0,
  "affected_radius_km": 0.0,
  "recommended_action": "IMMEDIATE_EVACUATION|PLANNED_RELOCATION|MONITORING|NO_ACTION",
  "hazard_types": ["flood", "landslide", "etc"]
}}"""
    
    result = _call_nova_micro(prompt, 500)
    
    # Provide safe defaults if AI fails
    return result or {
        "is_red_zone": False,
        "intensity": "medium",
        "confidence": 0.3,
        "reasoning": "Assessment failed — manual review required",
        "recommended_action": "MONITORING",
        "population_at_risk_estimate": 0,
        "affected_radius_km": 5.0,
        "hazard_types": [cluster_data.get('hazard_type', 'unknown')]
    }


def assess_habitation_priority(
    habitation: dict, 
    nearby_zones: List[dict], 
    recent_reports: List[dict], 
    available_sites: List[dict]
) -> dict:
    """
    Generate relocation priority for a vulnerable habitation.
    Replaces the hardcoded math formula with real AI reasoning.
    
    Args:
        habitation: Dict with name, district, state, population, households, hazard_types, exposure_score
        nearby_zones: List of nearby HazardZone dicts
        recent_reports: List of recent disaster reports in the area
        available_sites: List of available RelocationSite dicts
    
    Returns:
        Dict with priority, vulnerability_score, urgency_reason, estimated_timeline_months, etc.
    """
    multi_hazard_score = compute_multi_hazard_score(habitation.get('hazard_types', []))
    
    prompt = f"""You are an NDMA relocation planning expert for India.

Assess the relocation priority for this vulnerable settlement:

Settlement Details:
- Name: {habitation.get('name')}
- Location: {habitation.get('district')}, {habitation.get('state')}
- Population: {habitation.get('population', 0)} people, {habitation.get('households', 0)} households
- Known hazard exposure: {habitation.get('hazard_types', [])}
- Current exposure score: {habitation.get('exposure_score', 0):.2f}
- Multi-hazard composite score: {multi_hazard_score:.2f} ({len(habitation.get('hazard_types', []))} hazard types: {', '.join(habitation.get('hazard_types', []))})
- IMPORTANT: Multiple concurrent hazards significantly increase urgency. Weight this heavily.

Nearby Hazard Zones ({len(nearby_zones)} within 10km):
{json.dumps(nearby_zones[:3], indent=2)}

Recent Disaster Reports in Area ({len(recent_reports)} in last 2 years):
{json.dumps(recent_reports[:5], indent=2)}

Available Relocation Sites:
{json.dumps(available_sites[:3], indent=2)}

Determine the relocation priority considering:
1. Hazard intensity and frequency
2. Population vulnerability
3. Disaster history
4. Seasonal risk (India monsoon June-October)
5. Infrastructure and livelihood disruption

Output ONLY valid JSON:
{{
  "priority": "IMMEDIATE|SHORT_TERM|MEDIUM_TERM|SAFE",
  "vulnerability_score": 0.0-1.0,
  "urgency_reason": "one sentence",
  "estimated_timeline_months": 1-24,
  "key_risks": ["risk1", "risk2"],
  "recommended_site_id": null or site_id,
  "recommended_action": "specific action for authorities",
  "confidence": 0.0-1.0
}}"""

    result = _call_nova_micro(prompt, 500)
    
    # Provide safe defaults if AI fails
    return result or {
        "priority": "SHORT_TERM",
        "vulnerability_score": 0.5,
        "urgency_reason": "AI assessment failed — manual review required",
        "estimated_timeline_months": 12,
        "key_risks": ["Unknown"],
        "recommended_site_id": None,
        "recommended_action": "Conduct manual field assessment",
        "confidence": 0.3
    }


def assess_relocation_site(site: dict, nearby_hazard_zones: List[dict]) -> dict:
    """
    Assess suitability and carrying capacity of a candidate relocation site.
    
    Args:
        site: Dict with name, district, state, lat, lon, carrying_capacity, facilities
        nearby_hazard_zones: List of nearby HazardZone dicts
    
    Returns:
        Dict with suitability_score, carrying_capacity_assessment, strengths, concerns, etc.
    """
    prompt = f"""You are an NDMA site assessment expert for India.

Evaluate this candidate relocation site for displaced communities:

Site Details:
- Name: {site.get('name')}
- Location: {site.get('district')}, {site.get('state')}
- Coordinates: {site.get('latitude')}, {site.get('longitude')}
- Stated carrying capacity: {site.get('carrying_capacity', 0)} households
- Available facilities: {site.get('facilities', [])}
- Hazard-free radius: {site.get('hazard_free_radius_km', 5)}km

Nearby Hazard Zones ({len(nearby_hazard_zones)} within 20km):
{json.dumps(nearby_hazard_zones[:3], indent=2)}

Assess suitability for permanent relocation of disaster-displaced communities in India.
Consider:
1. Terrain safety (flood-prone, landslide risk, seismic)
2. Infrastructure needs (water, electricity, roads, healthcare, schools)
3. Livelihood options (agriculture, employment)
4. Cultural factors (distance from ancestral land, community cohesion)
5. Government resource requirements

Output ONLY valid JSON:
{{
  "suitability_score": 0.0-1.0,
  "carrying_capacity_assessment": "adequate|underestimated|overestimated",
  "recommended_capacity_households": 0,
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "required_infrastructure": ["item1", "item2"],
  "overall_recommendation": "APPROVE|APPROVE_WITH_CONDITIONS|REJECT",
  "reasoning": "one paragraph"
}}"""

    result = _call_nova_micro(prompt, 500)
    
    # Provide safe defaults if AI fails
    return result or {
        "suitability_score": 0.5,
        "carrying_capacity_assessment": "adequate",
        "recommended_capacity_households": site.get('carrying_capacity', 0),
        "strengths": [],
        "concerns": ["AI assessment failed"],
        "required_infrastructure": [],
        "overall_recommendation": "APPROVE_WITH_CONDITIONS",
        "reasoning": "AI assessment failed — manual review required"
    }


def generate_sdma_summary(
    zones: List[dict], 
    habitations: List[dict], 
    sites: List[dict]
) -> dict:
    """
    Generate executive summary for SDMA authorities.
    
    Args:
        zones: List of active HazardZone dicts
        habitations: List of VulnerableHabitation dicts
        sites: List of RelocationSite dicts
    
    Returns:
        Dict with executive_summary, immediate_actions, resource_requirements, timeline, risk_level
    """
    total_at_risk = sum(h.get('population', 0) for h in habitations)
    immediate_count = len([h for h in habitations if h.get('priority') == 'IMMEDIATE'])
    short_term_count = len([h for h in habitations if h.get('priority') == 'SHORT_TERM'])
    total_capacity = sum(s.get('available_capacity', 0) for s in sites)
    total_households = sum(h.get('households', 0) for h in habitations)
    
    prompt = f"""You are preparing an executive briefing for the State Disaster Management Authority (SDMA) of India.

Current Situation:
- Active Red Zones: {len(zones)}
- Total population at risk: {total_at_risk:,}
- Total households requiring relocation: {total_households:,}
- Habitations requiring IMMEDIATE relocation: {immediate_count}
- Habitations requiring SHORT_TERM relocation: {short_term_count}
- Available relocation site capacity: {total_capacity:,} households
- Capacity gap: {max(0, total_households - total_capacity):,} households

Top Priority Habitations:
{json.dumps([h for h in habitations if h.get('priority') == 'IMMEDIATE'][:5], indent=2)}

Active Red Zones Summary:
{json.dumps([{'name': z.get('name'), 'district': z.get('district'), 'intensity': z.get('intensity'), 'population_at_risk': z.get('population_at_risk')} for z in zones[:5]], indent=2)}

Write a concise executive summary with actionable recommendations for state authorities.

Consider:
1. Immediate life-safety concerns
2. Monsoon season preparedness
3. Resource mobilization
4. Inter-agency coordination
5. Community engagement

Output ONLY valid JSON:
{{
  "executive_summary": "2-3 paragraph summary",
  "immediate_actions": ["action1", "action2", "action3"],
  "resource_requirements": {{
    "estimated_cost_crore": 0.0,
    "transport_vehicles": 0,
    "temporary_shelters_needed": 0
  }},
  "timeline": {{
    "immediate_0_3_months": "what needs to happen",
    "short_term_3_12_months": "what needs to happen",
    "medium_term_1_2_years": "what needs to happen"
  }},
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL"
}}"""

    result = _call_nova_micro(prompt, 800)
    
    # Provide safe defaults if AI fails
    return result or {
        "executive_summary": f"The state has {len(zones)} active hazard zones affecting {total_at_risk:,} people across {len(habitations)} settlements. {immediate_count} habitations require immediate relocation. Current relocation site capacity is {total_capacity:,} households, creating a gap of {max(0, total_households - total_capacity):,} households. AI summary generation failed — manual review required.",
        "immediate_actions": [
            "Conduct field verification of immediate priority settlements",
            "Mobilize emergency relocation resources",
            "Establish coordination with district authorities"
        ],
        "resource_requirements": {
            "estimated_cost_crore": float(total_households * 0.5),  # Rough estimate
            "transport_vehicles": max(10, immediate_count * 2),
            "temporary_shelters_needed": max(0, total_households - total_capacity)
        },
        "timeline": {
            "immediate_0_3_months": "Address immediate priority relocations",
            "short_term_3_12_months": "Process short-term priority settlements",
            "medium_term_1_2_years": "Complete medium-term relocations and infrastructure development"
        },
        "risk_level": "HIGH" if immediate_count > 0 else "MEDIUM"
    }
