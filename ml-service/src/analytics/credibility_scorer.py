import logging
import math
import re
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd


logger = logging.getLogger(__name__)


class CredibilityScorer:
    """
    Evidence-based credibility scoring.

    Citizen reports and social-media posts use separate profiles because
    followers and engagement should not determine a citizen report's
    credibility.
    """

    CITIZEN_WEIGHTS = {
        "location": 0.20,
        "media": 0.15,
        "text_quality": 0.20,
        "report_details": 0.10,
        "hazard_evidence": 0.25,
        "consistency": 0.10,
    }

    SOCIAL_WEIGHTS = {
        "location": 0.15,
        "location_specificity": 0.10,
        "media": 0.15,
        "media_count": 0.05,
        "engagement": 0.10,
        "share_ratio": 0.05,
        "author": 0.10,
        "verified_account": 0.05,
        "text_quality": 0.10,
        "report_details": 0.05,
        "consistency": 0.10,
    }

    def __init__(self) -> None:
        self.high_credibility_threshold = 0.70
        self.medium_credibility_threshold = 0.50
        logger.info("CredibilityScorer initialized")

    @staticmethod
    def _value(report: pd.Series, key: str, default: Any = None) -> Any:
        value = report.get(key, default)

        if value is None:
            return default

        try:
            missing = pd.isna(value)
        except (TypeError, ValueError):
            return value

        # Collections produce an array of booleans from pd.isna().
        # Only scalar missing-value results should be evaluated here.
        if isinstance(missing, (bool, np.bool_)) and missing:
            return default

        return value

    @classmethod
    def _bool(cls, report: pd.Series, key: str) -> bool:
        value = cls._value(report, key, False)

        if isinstance(value, str):
            return value.strip().lower() in {
                "true",
                "1",
                "yes",
                "y",
            }

        return bool(value)

    @staticmethod
    def _clamp(value: Any, default: float = 0.0) -> float:
        try:
            numeric = float(value)

            if not math.isfinite(numeric):
                return default

            return max(0.0, min(1.0, numeric))
        except (TypeError, ValueError):
            return default

    @classmethod
    def _has_coordinates(cls, report: pd.Series) -> bool:
        latitude = cls._value(report, "latitude")
        longitude = cls._value(report, "longitude")

        if latitude is None or longitude is None:
            return False

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except (TypeError, ValueError):
            return False

        return (
            math.isfinite(latitude)
            and math.isfinite(longitude)
            and -90 <= latitude <= 90
            and -180 <= longitude <= 180
        )

    @classmethod
    def _location_evidence(cls, report: pd.Series) -> float:
        if cls._bool(report, "has_location"):
            return 1.0

        if cls._bool(report, "has_location_entity"):
            return 1.0

        if cls._has_coordinates(report):
            return 1.0

        locations = cls._value(report, "extracted_locations", [])
        return 1.0 if locations else 0.0

    @classmethod
    def _media_evidence(cls, report: pd.Series) -> float:
        has_media = cls._bool(report, "has_media")
        media_count = max(
            0,
            int(cls._value(report, "media_count", 0) or 0),
        )

        if not has_media and media_count == 0:
            return 0.0

        # One attachment establishes media evidence. Additional attachments
        # increase it slightly without allowing quantity to dominate.
        return min(1.0, 0.75 + min(media_count, 3) * 0.0833)

    @classmethod
    def _text_quality(cls, report: pd.Series) -> float:
        text = str(cls._value(report, "text", "") or "").strip()
        word_count = cls._value(report, "word_count")

        if word_count is None:
            word_count = len(text.split())

        try:
            word_count = max(0, int(word_count))
        except (TypeError, ValueError):
            word_count = 0

        if word_count == 0:
            return 0.0

        if word_count < 12:
            return word_count / 12

        if word_count <= 180:
            return 1.0

        # Very long reports remain useful, but may contain irrelevant text.
        return max(0.60, 1.0 - ((word_count - 180) / 600))

    @classmethod
    def _detail_evidence(cls, report: pd.Series) -> float:
        text = str(cls._value(report, "text", "") or "")

        has_number = cls._bool(report, "has_numbers") or bool(
            re.search(r"\d", text)
        )
        has_date = (
            float(cls._value(report, "date_count", 0) or 0) > 0
            or bool(
                re.search(
                    r"\b(?:today|tonight|tomorrow|yesterday)\b",
                    text,
                    flags=re.IGNORECASE,
                )
            )
        )
        has_time = (
            float(cls._value(report, "time_count", 0) or 0) > 0
            or bool(
                re.search(
                    r"\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b",
                    text,
                    flags=re.IGNORECASE,
                )
            )
        )

        detail_signals = sum((has_number, has_date, has_time))
        return detail_signals / 3

    @classmethod
    def _hazard_evidence(cls, report: pd.Series) -> float:
        is_hazard = cls._bool(report, "is_hazard")
        confidence = cls._clamp(
            cls._value(report, "hazard_confidence"),
            default=1.0 if is_hazard else 0.0,
        )

        return confidence if is_hazard else 0.0

    @classmethod
    def _consistency(cls, report: pd.Series) -> float:
        is_hazard = cls._bool(report, "is_hazard")
        sentiment = str(
            cls._value(report, "sentiment", "neutral")
        ).strip().lower()

        has_urgency = cls._bool(report, "has_urgency_words")
        panic_level = str(
            cls._value(report, "predicted_panic_level", "")
        ).strip().lower()

        if not is_hazard:
            sentiment_score = 0.50
        elif sentiment in {"negative", "fear", "urgent"}:
            sentiment_score = 1.0
        elif sentiment in {"neutral", "unknown", ""}:
            sentiment_score = 0.75
        else:
            # Sentiment models can classify calm, factual hazard reports as
            # positive. Do not treat that alone as evidence of fabrication.
            sentiment_score = 0.50

        if not panic_level:
            urgency_score = 0.50
        elif has_urgency and panic_level in {"high", "critical"}:
            urgency_score = 1.0
        elif not has_urgency and panic_level in {"low", "medium"}:
            urgency_score = 1.0
        else:
            urgency_score = 0.25

        return (sentiment_score + urgency_score) / 2

    def _citizen_breakdown(
        self,
        report: pd.Series,
    ) -> Dict[str, float]:
        raw_scores = {
            "location": self._location_evidence(report),
            "media": self._media_evidence(report),
            "text_quality": self._text_quality(report),
            "report_details": self._detail_evidence(report),
            "hazard_evidence": self._hazard_evidence(report),
            "consistency": self._consistency(report),
        }

        weighted = {
            key: raw_scores[key] * self.CITIZEN_WEIGHTS[key]
            for key in self.CITIZEN_WEIGHTS
        }

        return {
            **{key: round(value, 4) for key, value in weighted.items()},
            "total": round(
                self._clamp(sum(weighted.values())),
                4,
            ),
        }

    def _social_breakdown(
        self,
        report: pd.Series,
    ) -> Dict[str, float]:
        location = self._location_evidence(report)
        location_count = max(
            0.0,
            float(self._value(report, "location_count", 0) or 0),
        )
        media = self._media_evidence(report)

        total_engagement = max(
            0.0,
            float(self._value(report, "total_engagement", 0) or 0),
        )
        engagement = min(
            np.log1p(total_engagement) / np.log1p(1000),
            1.0,
        )

        shares = max(
            0.0,
            float(self._value(report, "shares", 0) or 0),
        )
        share_ratio = self._value(report, "share_ratio")

        if share_ratio is None:
            share_ratio = (
                shares / total_engagement
                if total_engagement > 0
                else 0.0
            )

        followers = max(
            0.0,
            float(self._value(report, "author_followers", 0) or 0),
        )
        author = min(
            np.log1p(followers) / np.log1p(10000),
            1.0,
        )

        raw_scores = {
            "location": location,
            "location_specificity": min(location_count, 1.0),
            "media": media,
            "media_count": min(
                float(self._value(report, "media_count", 0) or 0) / 3,
                1.0,
            ),
            "engagement": engagement,
            "share_ratio": self._clamp(share_ratio),
            "author": author,
            "verified_account": float(
                self._bool(report, "is_verified_account")
                or self._bool(report, "is_verified")
            ),
            "text_quality": self._text_quality(report),
            "report_details": self._detail_evidence(report),
            "consistency": self._consistency(report),
        }

        weighted = {
            key: raw_scores[key] * self.SOCIAL_WEIGHTS[key]
            for key in self.SOCIAL_WEIGHTS
        }

        return {
            **{key: round(value, 4) for key, value in weighted.items()},
            "total": round(
                self._clamp(sum(weighted.values())),
                4,
            ),
        }

    def get_score_breakdown(
        self,
        report: pd.Series,
        profile: Optional[str] = None,
    ) -> Dict[str, float]:
        selected_profile = (
            profile
            or str(self._value(report, "source_type", "social"))
        ).strip().lower()

        if selected_profile == "citizen":
            return self._citizen_breakdown(report)

        return self._social_breakdown(report)

    def score_report(
        self,
        report: pd.Series,
        profile: Optional[str] = None,
    ) -> float:
        return self.get_score_breakdown(
            report,
            profile=profile,
        )["total"]

    def categorize_credibility(self, score: float) -> str:
        if score >= self.high_credibility_threshold:
            return "high"

        if score >= self.medium_credibility_threshold:
            return "medium"

        return "low"

    def score_batch(
        self,
        df: pd.DataFrame,
        add_category: bool = True,
        profile: Optional[str] = None,
    ) -> pd.DataFrame:
        logger.info("Scoring credibility for %s reports", len(df))

        scored = df.copy()
        scored["credibility_score"] = scored.apply(
            lambda report: self.score_report(
                report,
                profile=profile,
            ),
            axis=1,
        )

        if add_category:
            scored["credibility_category"] = scored[
                "credibility_score"
            ].apply(self.categorize_credibility)

        return scored

    def score_posts(
        self,
        df: pd.DataFrame,
        add_category: bool = True,
    ) -> pd.DataFrame:
        return self.score_batch(
            df,
            add_category=add_category,
            profile="social",
        )

    def calculate_credibility(
        self,
        df: pd.DataFrame,
        add_category: bool = True,
    ) -> pd.DataFrame:
        return self.score_batch(
            df,
            add_category=add_category,
        )