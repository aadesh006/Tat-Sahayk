import pandas as pd
import pytest

from src.analytics.credibility_scorer import CredibilityScorer


@pytest.fixture
def scorer():
    return CredibilityScorer()


def test_citizen_report_does_not_depend_on_followers(scorer):
    base_report = {
        "source_type": "citizen",
        "text": (
            "Large waves are crossing the sea wall near the harbour "
            "today at 8 pm."
        ),
        "latitude": 19.076,
        "longitude": 72.8777,
        "has_location": True,
        "has_media": False,
        "media_count": 0,
        "is_hazard": True,
        "hazard_confidence": 0.8,
        "sentiment": "negative",
        "has_urgency_words": True,
    }

    no_followers = pd.Series({
        **base_report,
        "author_followers": 0,
    })
    many_followers = pd.Series({
        **base_report,
        "author_followers": 1_000_000,
    })

    assert scorer.score_report(no_followers) == scorer.score_report(
        many_followers
    )


def test_citizen_location_boolean_is_recognized(scorer):
    report = pd.Series({
        "source_type": "citizen",
        "text": "Water is entering homes near the coast.",
        "has_location": True,
        "has_media": False,
        "is_hazard": True,
        "hazard_confidence": 0.8,
        "sentiment": "negative",
    })

    breakdown = scorer.get_score_breakdown(report)

    assert breakdown["location"] == pytest.approx(0.20)


def test_stronger_evidence_increases_citizen_score(scorer):
    weak_report = pd.Series({
        "source_type": "citizen",
        "text": "Flood.",
        "has_location": False,
        "has_media": False,
        "is_hazard": True,
        "hazard_confidence": 0.55,
        "sentiment": "neutral",
    })

    strong_report = pd.Series({
        "source_type": "citizen",
        "text": (
            "Coastal flood water entered three homes near Marine Road "
            "today at 7 pm."
        ),
        "latitude": 19.076,
        "longitude": 72.8777,
        "has_location": True,
        "has_media": True,
        "media_count": 2,
        "is_hazard": True,
        "hazard_confidence": 0.92,
        "sentiment": "negative",
        "has_urgency_words": True,
    })

    assert scorer.score_report(strong_report) > scorer.score_report(
        weak_report
    )


def test_score_and_breakdown_are_bounded(scorer):
    report = pd.Series({
        "source_type": "citizen",
        "text": "Cyclone conditions reported near the harbour.",
        "has_location": True,
        "has_media": True,
        "media_count": 10,
        "is_hazard": True,
        "hazard_confidence": 5,
        "sentiment": "negative",
    })

    breakdown = scorer.get_score_breakdown(report)
    score = scorer.score_report(report)

    assert 0.0 <= score <= 1.0
    assert score == breakdown["total"]