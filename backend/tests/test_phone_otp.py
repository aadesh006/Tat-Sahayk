from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import auth
from app.core.security import get_password_hash, verify_password
from app.services import aws_services
from app.services.phone_otp import (
    OTPDelivery,
    PhoneOTPError,
    deliver_otp,
    normalize_indian_phone_number,
)


class FakeDatabase:
    def __init__(self):
        self.commits = 0
        self.refreshes = 0
        self.rollbacks = 0

    def commit(self):
        self.commits += 1

    def refresh(self, _user):
        self.refreshes += 1

    def rollback(self):
        self.rollbacks += 1


def make_user(**overrides):
    values = {
        "phone": None,
        "phone_verified": False,
        "otp_code": None,
        "otp_expires_at": None,
        "otp_attempt_count": 0,
        "otp_last_sent_at": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def set_phone_settings(
    monkeypatch,
    *,
    provider="console",
    environment="development",
    resend_seconds=60,
    max_attempts=5,
):
    monkeypatch.setattr(
        auth.settings,
        "PHONE_OTP_PROVIDER",
        provider,
    )
    monkeypatch.setattr(
        auth.settings,
        "ENVIRONMENT",
        environment,
    )
    monkeypatch.setattr(
        auth.settings,
        "PHONE_OTP_TTL_MINUTES",
        10,
    )
    monkeypatch.setattr(
        auth.settings,
        "PHONE_OTP_RESEND_SECONDS",
        resend_seconds,
    )
    monkeypatch.setattr(
        auth.settings,
        "PHONE_OTP_MAX_ATTEMPTS",
        max_attempts,
    )


def test_phone_number_normalization_accepts_common_inputs():
    assert normalize_indian_phone_number(
        "9876543210"
    ) == "+919876543210"
    assert normalize_indian_phone_number(
        "+91 98765 43210"
    ) == "+919876543210"
    assert normalize_indian_phone_number(
        "919876543210"
    ) == "+919876543210"


@pytest.mark.parametrize(
    "phone",
    ["1234567890", "987654321", "not-a-phone"],
)
def test_phone_number_normalization_rejects_invalid_input(phone):
    with pytest.raises(PhoneOTPError):
        normalize_indian_phone_number(phone)


def test_console_delivery_returns_development_code(
    monkeypatch,
):
    set_phone_settings(monkeypatch)

    delivery = deliver_otp(
        "+919876543210",
        "123456",
    )

    assert delivery.provider == "console"
    assert delivery.development_otp == "123456"


def test_disabled_delivery_is_rejected(monkeypatch):
    set_phone_settings(monkeypatch, provider="disabled")

    with pytest.raises(PhoneOTPError):
        deliver_otp("+919876543210", "123456")


def test_console_delivery_is_rejected_in_production(
    monkeypatch,
):
    set_phone_settings(
        monkeypatch,
        environment="production",
    )

    with pytest.raises(PhoneOTPError):
        deliver_otp("+919876543210", "123456")


def test_send_otp_stores_only_a_hash(monkeypatch):
    set_phone_settings(monkeypatch)
    fixed_now = datetime(2026, 7, 29, tzinfo=timezone.utc)
    user = make_user()
    database = FakeDatabase()

    monkeypatch.setattr(auth, "utc_now", lambda: fixed_now)
    monkeypatch.setattr(auth, "generate_otp", lambda: "123456")
    monkeypatch.setattr(
        auth,
        "deliver_otp",
        lambda _phone, otp: OTPDelivery(
            provider="console",
            development_otp=otp,
        ),
    )

    response = auth.send_otp(
        request=auth.OTPRequest(phone="9876543210"),
        db=database,
        current_user=user,
    )

    assert response["development_otp"] == "123456"
    assert user.phone == "+919876543210"
    assert user.otp_code != "123456"
    assert verify_password("123456", user.otp_code)
    assert user.otp_attempt_count == 0
    assert user.otp_last_sent_at == fixed_now
    assert database.commits == 1


def test_send_otp_enforces_resend_cooldown(monkeypatch):
    fixed_now = datetime(2026, 7, 29, tzinfo=timezone.utc)
    set_phone_settings(monkeypatch)
    user = make_user(otp_last_sent_at=fixed_now)

    monkeypatch.setattr(auth, "utc_now", lambda: fixed_now)

    with pytest.raises(HTTPException) as exc:
        auth.send_otp(
            request=auth.OTPRequest(phone="9876543210"),
            db=FakeDatabase(),
            current_user=user,
        )

    assert exc.value.status_code == 429


def test_send_otp_does_not_persist_when_delivery_fails(
    monkeypatch,
):
    set_phone_settings(monkeypatch)
    user = make_user(phone="+919111111111")

    monkeypatch.setattr(
        auth,
        "deliver_otp",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            PhoneOTPError("delivery failed")
        ),
    )

    with pytest.raises(HTTPException) as exc:
        auth.send_otp(
            request=auth.OTPRequest(phone="9876543210"),
            db=FakeDatabase(),
            current_user=user,
        )

    assert exc.value.status_code == 503
    assert user.phone == "+919111111111"
    assert user.otp_code is None


def test_invalid_otp_increments_attempt_count(monkeypatch):
    set_phone_settings(monkeypatch)
    user = make_user(
        phone="+919876543210",
        otp_code=get_password_hash("123456"),
        otp_expires_at=(
            datetime.now(timezone.utc) + timedelta(minutes=5)
        ),
    )

    with pytest.raises(HTTPException) as exc:
        auth.verify_otp(
            request=auth.OTPVerify(
                phone="9876543210",
                otp="000000",
            ),
            db=FakeDatabase(),
            current_user=user,
        )

    assert exc.value.status_code == 400
    assert user.otp_attempt_count == 1
    assert user.otp_code is not None


def test_maximum_otp_attempts_clear_the_code(monkeypatch):
    set_phone_settings(monkeypatch, max_attempts=1)
    user = make_user(
        phone="+919876543210",
        otp_code=get_password_hash("123456"),
        otp_expires_at=(
            datetime.now(timezone.utc) + timedelta(minutes=5)
        ),
    )

    with pytest.raises(HTTPException) as exc:
        auth.verify_otp(
            request=auth.OTPVerify(
                phone="9876543210",
                otp="000000",
            ),
            db=FakeDatabase(),
            current_user=user,
        )

    assert exc.value.status_code == 429
    assert user.otp_code is None
    assert user.otp_expires_at is None


def test_valid_otp_verifies_phone_and_clears_state(
    monkeypatch,
):
    set_phone_settings(monkeypatch)
    user = make_user(
        phone="+919876543210",
        otp_code=get_password_hash("123456"),
        otp_expires_at=(
            datetime.now(timezone.utc) + timedelta(minutes=5)
        ),
        otp_attempt_count=2,
    )
    database = FakeDatabase()

    response = auth.verify_otp(
        request=auth.OTPVerify(
            phone="9876543210",
            otp="123456",
        ),
        db=database,
        current_user=user,
    )

    assert response["phone_verified"] is True
    assert user.phone_verified is True
    assert user.otp_code is None
    assert user.otp_expires_at is None
    assert user.otp_attempt_count == 0
    assert database.commits == 1


def test_expired_otp_is_cleared(monkeypatch):
    fixed_now = datetime(2026, 7, 29, tzinfo=timezone.utc)
    set_phone_settings(monkeypatch)
    user = make_user(
        phone="+919876543210",
        otp_code=get_password_hash("123456"),
        otp_expires_at=(
            fixed_now - timedelta(seconds=1)
        ),
    )

    monkeypatch.setattr(auth, "utc_now", lambda: fixed_now)

    with pytest.raises(HTTPException) as exc:
        auth.verify_otp(
            request=auth.OTPVerify(
                phone="9876543210",
                otp="123456",
            ),
            db=FakeDatabase(),
            current_user=user,
        )

    assert exc.value.status_code == 400
    assert user.otp_code is None


def test_aws_clients_are_lazy_when_disabled(monkeypatch):
    monkeypatch.setattr(
        aws_services.settings,
        "AWS_ENABLED",
        False,
    )
    monkeypatch.setattr(
        aws_services.boto3,
        "client",
        lambda *_args, **_kwargs: pytest.fail(
            "AWS client should not be created"
        ),
    )

    assert not aws_services.send_otp_sms(
        "+919876543210",
        "123456",
    )


def test_sns_delivery_uses_lazy_configured_client(
    monkeypatch,
):
    monkeypatch.setattr(
        aws_services.settings,
        "AWS_ENABLED",
        True,
    )
    monkeypatch.setattr(
        aws_services.settings,
        "AWS_REGION",
        "ap-south-1",
    )
    monkeypatch.setattr(
        aws_services.settings,
        "AWS_ACCESS_KEY_ID",
        None,
    )
    monkeypatch.setattr(
        aws_services.settings,
        "AWS_SECRET_ACCESS_KEY",
        None,
    )
    captured = {}

    class FakeSNS:
        def publish(self, **kwargs):
            captured.update(kwargs)
            return {
                "ResponseMetadata": {
                    "HTTPStatusCode": 200,
                }
            }

    monkeypatch.setattr(
        aws_services.boto3,
        "client",
        lambda name, **kwargs: (
            captured.update({"name": name, **kwargs})
            or FakeSNS()
        ),
    )

    assert aws_services.send_otp_sms(
        "+919876543210",
        "123456",
    )
    assert captured["name"] == "sns"
    assert captured["region_name"] == "ap-south-1"
    assert captured["PhoneNumber"] == "+919876543210"
