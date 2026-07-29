import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from app.services.ai import AIAnalysisRequest, get_ai_service


def main():
    request = AIAnalysisRequest(
        report_id=0,
        description=(
            "Strong cyclone winds and storm surge reported near the coast. "
            "Residents are being evacuated immediately."
        ),
        hazard_type="cyclone",
        latitude=19.0760,
        longitude=72.8777,
        media_url=None,
        media_count=0,
        state="Maharashtra",
    )

    result = get_ai_service().analyze(request)

    print(json.dumps(result.to_dict(), indent=2, default=str))


if __name__ == "__main__":
    main()