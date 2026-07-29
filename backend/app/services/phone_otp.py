"""Phone OTP generation, delivery selection, and phone normalization."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from secrets import randbelow

from app.core.config import settings
from app.services.aws_services import send_otp_sms


logger = logging.getLogger(__name__)


class PhoneOTPError(Exception):
    """Raised when an OTP cannot be delivered safely."""


def normalize_indian_phone_number(phone: str) -> str:
    """Return an Indian mobile number in E.164 format."""
    digits = re.sub(r"\D", "", phone or "")

    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]

    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise PhoneOTPError(
            "Enter a valid 10-digit Indian mobile number"
        )

    return f"+91{digits}"


def mask_phone_number(phone: str) -> str:
    """Mask a normalized phone number for logs and API responses."""
    if len(phone) < 6:
        return "***"

    return f"{phone[:3]}******{phone[-2:]}"


def generate_otp() -> str:
    """Generate a cryptographically secure six-digit OTP."""
    return f"{randbelow(900_000) + 100_000:06d}"


@dataclass(frozen=True)
class OTPDelivery:
    provider: str
    development_otp: str | None = None


def deliver_otp(phone: str, otp: str) -> OTPDelivery:
    """Deliver an OTP with the configured provider."""
    provider = settings.PHONE_OTP_PROVIDER

    if provider == "disabled":
        raise PhoneOTPError(
            "Phone verification is not enabled"
        )

    if provider == "console":
        if settings.is_production:
            raise PhoneOTPError(
                "Console OTP delivery is not allowed in production"
            )

        logger.warning(
            "Development OTP issued for %s: %s",
            mask_phone_number(phone),
            otp,
        )

        return OTPDelivery(
            provider="console",
            development_otp=otp,
        )

    if provider == "sns":
        if not send_otp_sms(phone, otp):
            raise PhoneOTPError(
                "SMS delivery failed. Please try again later"
            )

        return OTPDelivery(provider="sns")

    raise PhoneOTPError(
        f"Unsupported phone OTP provider: {provider}"
    )
