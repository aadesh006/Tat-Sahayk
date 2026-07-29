"""Optional AWS integrations for SNS SMS and SES email."""

from __future__ import annotations

import logging
from typing import Any

import boto3

from app.core.config import settings


logger = logging.getLogger(__name__)


def get_aws_client(service_name: str) -> Any:
    """Create an AWS client lazily so local mode never contacts AWS."""
    if not settings.AWS_ENABLED:
        raise RuntimeError("AWS integrations are disabled")

    options: dict[str, str] = {
        "region_name": settings.AWS_REGION,
    }

    if (
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
    ):
        options.update(
            {
                "aws_access_key_id": (
                    settings.AWS_ACCESS_KEY_ID
                ),
                "aws_secret_access_key": (
                    settings.AWS_SECRET_ACCESS_KEY
                ),
            }
        )

    return boto3.client(service_name, **options)


def send_otp_sms(phone: str, otp: str) -> bool:
    """Send a transactional OTP through AWS SNS."""
    if not settings.AWS_ENABLED:
        logger.warning(
            "Skipping SNS OTP because AWS is disabled"
        )
        return False

    try:
        response = get_aws_client("sns").publish(
            PhoneNumber=phone,
            Message=(
                "Your Tat-Sahayk verification code is: "
                f"{otp}\n\n"
                "This code expires soon. Do not share it."
            ),
            MessageAttributes={
                "AWS.SNS.SMS.SenderID": {
                    "DataType": "String",
                    "StringValue": "TatSahayk",
                },
                "AWS.SNS.SMS.SMSType": {
                    "DataType": "String",
                    "StringValue": "Transactional",
                },
            },
        )

        return (
            response.get("ResponseMetadata", {}).get(
                "HTTPStatusCode"
            )
            == 200
        )
    except Exception:
        logger.exception("SNS OTP delivery failed")
        return False


def send_disaster_alert_email(
    to_email: str,
    user_name: str,
    disaster_type: str,
    location: str,
    severity: str,
    description: str,
) -> bool:
    """Send a disaster notification through AWS SES when configured."""
    if not settings.AWS_ENABLED or not settings.SES_SOURCE_EMAIL:
        logger.info(
            "Skipping SES alert because SES is not configured"
        )
        return False

    subject = (
        f"{severity.upper()} alert: {disaster_type} "
        "near your location"
    )
    text_body = (
        f"Hello {user_name},\n\n"
        "A verified coastal-hazard report was registered "
        "near your location.\n\n"
        f"Type: {disaster_type}\n"
        f"Severity: {severity.upper()}\n"
        f"Location: {location}\n"
        f"Details: {description}\n\n"
        "Follow official guidance and local emergency services."
    )
    html_body = (
        "<html><body>"
        f"<p>Hello {user_name},</p>"
        "<p>A verified coastal-hazard report was registered "
        "near your location.</p>"
        "<ul>"
        f"<li><strong>Type:</strong> {disaster_type}</li>"
        f"<li><strong>Severity:</strong> {severity.upper()}</li>"
        f"<li><strong>Location:</strong> {location}</li>"
        f"<li><strong>Details:</strong> {description}</li>"
        "</ul>"
        "<p>Follow official guidance and local emergency services.</p>"
        "</body></html>"
    )

    try:
        response = get_aws_client("ses").send_email(
            Source=settings.SES_SOURCE_EMAIL,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {
                    "Data": subject,
                    "Charset": "UTF-8",
                },
                "Body": {
                    "Text": {
                        "Data": text_body,
                        "Charset": "UTF-8",
                    },
                    "Html": {
                        "Data": html_body,
                        "Charset": "UTF-8",
                    },
                },
            },
        )

        return (
            response.get("ResponseMetadata", {}).get(
                "HTTPStatusCode"
            )
            == 200
        )
    except Exception:
        logger.exception("SES alert delivery failed")
        return False
