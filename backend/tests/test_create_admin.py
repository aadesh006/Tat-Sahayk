import pytest

from scripts.create_admin import (
    normalize_admin_email,
    resolve_admin_scope,
    validate_admin_password,
)


@pytest.mark.parametrize(
    "password",
    [
        "Short1!",
        "all-lowercase-123!",
        "ALL-UPPERCASE-123!",
        "NoNumbersIncluded!",
        "NoSpecialCharacter123",
    ],
)
def test_admin_password_rejects_weak_values(
    password,
):
    with pytest.raises(ValueError):
        validate_admin_password(password)


def test_admin_password_accepts_strong_value():
    password = "Secure-Admin-2026!"

    assert (
        validate_admin_password(password)
        == password
    )


def test_admin_email_is_normalized():
    assert normalize_admin_email(
        " Admin@EXAMPLE.COM "
    ) == "admin@example.com"


def test_admin_email_rejects_invalid_value():
    with pytest.raises(ValueError):
        normalize_admin_email("not-an-email")


def test_national_admin_has_no_local_scope():
    assert resolve_admin_scope(
        national=True,
        district="Ignored",
        state="Ignored",
    ) == (None, None)


def test_district_admin_requires_complete_scope():
    with pytest.raises(ValueError):
        resolve_admin_scope(
            national=False,
            district="Mumbai",
            state=None,
        )


def test_district_admin_preserves_scope():
    assert resolve_admin_scope(
        national=False,
        district=" Mumbai ",
        state=" Maharashtra ",
    ) == ("Mumbai", "Maharashtra")
