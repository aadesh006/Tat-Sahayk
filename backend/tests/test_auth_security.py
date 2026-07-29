from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api import deps
from app.api.v1.endpoints import auth
from app.core.security import (
    create_access_token,
    get_password_hash,
)
from app.services.authentication import (
    LEGACY_GOOGLE_PASSWORD_SENTINEL,
    generate_unusable_password,
    uses_legacy_google_password,
)


class FakeDatabase:
    def __init__(self):
        self.commits = 0
        self.refreshes = 0

    def commit(self):
        self.commits += 1

    def refresh(self, _user):
        self.refreshes += 1


def make_user(
    *,
    email="citizen@example.com",
    password="CitizenPassword123!",
    role="citizen",
    is_active=True,
):
    return SimpleNamespace(
        email=email,
        full_name="Citizen",
        hashed_password=get_password_hash(password),
        role=role,
        is_active=is_active,
        profile_photo=None,
    )


def google_identity(
    *,
    email="citizen@example.com",
    verified=True,
):
    return {
        "email": email,
        "email_verified": verified,
        "name": "Citizen",
    }


def configure_google(
    monkeypatch,
    identity,
):
    monkeypatch.setattr(
        auth.settings,
        "GOOGLE_CLIENT_ID",
        "test-google-client-id",
    )
    monkeypatch.setattr(
        auth.id_token,
        "verify_oauth2_token",
        lambda *_args, **_kwargs: identity,
    )


def test_generated_oauth_password_is_unique_and_unusable():
    first = generate_unusable_password()
    second = generate_unusable_password()

    assert first != second
    assert len(first) >= 48
    assert (
        first
        != LEGACY_GOOGLE_PASSWORD_SENTINEL
    )


def test_legacy_google_password_is_detected():
    legacy_hash = get_password_hash(
        LEGACY_GOOGLE_PASSWORD_SENTINEL
    )

    assert uses_legacy_google_password(
        legacy_hash
    )
    assert not uses_legacy_google_password(
        get_password_hash("DifferentPassword123!")
    )
    assert not uses_legacy_google_password(
        "not-a-valid-password-hash"
    )


def test_password_login_rejects_legacy_google_account(
    monkeypatch,
):
    user = make_user(
        password=LEGACY_GOOGLE_PASSWORD_SENTINEL
    )
    monkeypatch.setattr(
        auth.crud_user,
        "get_user_by_email",
        lambda *_args, **_kwargs: user,
    )
    form = SimpleNamespace(
        username=user.email,
        password=LEGACY_GOOGLE_PASSWORD_SENTINEL,
    )

    with pytest.raises(HTTPException) as exc:
        auth.login(
            db=FakeDatabase(),
            form_data=form,
        )

    assert exc.value.status_code == 401


def test_inactive_password_account_cannot_login(
    monkeypatch,
):
    password = "CitizenPassword123!"
    user = make_user(
        password=password,
        is_active=False,
    )
    monkeypatch.setattr(
        auth.crud_user,
        "get_user_by_email",
        lambda *_args, **_kwargs: user,
    )
    form = SimpleNamespace(
        username=user.email,
        password=password,
    )

    with pytest.raises(HTTPException) as exc:
        auth.login(
            db=FakeDatabase(),
            form_data=form,
        )

    assert exc.value.status_code == 403


def test_google_login_requires_configuration(
    monkeypatch,
):
    monkeypatch.setattr(
        auth.settings,
        "GOOGLE_CLIENT_ID",
        None,
    )

    with pytest.raises(HTTPException) as exc:
        auth.google_login(
            payload=auth.GoogleLoginRequest(
                credential="token"
            ),
            db=FakeDatabase(),
        )

    assert exc.value.status_code == 503


def test_google_login_requires_verified_email(
    monkeypatch,
):
    configure_google(
        monkeypatch,
        google_identity(verified=False),
    )

    with pytest.raises(HTTPException) as exc:
        auth.google_login(
            payload=auth.GoogleLoginRequest(
                credential="token"
            ),
            db=FakeDatabase(),
        )

    assert exc.value.status_code == 401


def test_new_google_user_gets_random_password_material(
    monkeypatch,
):
    configure_google(
        monkeypatch,
        google_identity(),
    )
    captured = {}

    monkeypatch.setattr(
        auth.crud_user,
        "get_user_by_email",
        lambda *_args, **_kwargs: None,
    )

    def create_user(_db, user):
        captured["password"] = user.password

        return make_user(
            email=str(user.email),
            password=user.password,
        )

    monkeypatch.setattr(
        auth.crud_user,
        "create_user",
        create_user,
    )

    result = auth.google_login(
        payload=auth.GoogleLoginRequest(
            credential="token"
        ),
        db=FakeDatabase(),
    )

    password = captured["password"]

    assert result["token_type"] == "bearer"
    assert password != LEGACY_GOOGLE_PASSWORD_SENTINEL
    assert len(password) >= 48


def test_google_login_rotates_legacy_password(
    monkeypatch,
):
    configure_google(
        monkeypatch,
        google_identity(),
    )
    user = make_user(
        password=LEGACY_GOOGLE_PASSWORD_SENTINEL
    )
    database = FakeDatabase()

    monkeypatch.setattr(
        auth.crud_user,
        "get_user_by_email",
        lambda *_args, **_kwargs: user,
    )

    auth.google_login(
        payload=auth.GoogleLoginRequest(
            credential="token"
        ),
        db=database,
    )

    assert database.commits == 1
    assert database.refreshes == 1
    assert not uses_legacy_google_password(
        user.hashed_password
    )


def test_google_login_rejects_admin_account(
    monkeypatch,
):
    configure_google(
        monkeypatch,
        google_identity(),
    )
    user = make_user(role="admin")

    monkeypatch.setattr(
        auth.crud_user,
        "get_user_by_email",
        lambda *_args, **_kwargs: user,
    )

    with pytest.raises(HTTPException) as exc:
        auth.google_login(
            payload=auth.GoogleLoginRequest(
                credential="token"
            ),
            db=FakeDatabase(),
        )

    assert exc.value.status_code == 403


def test_token_email_decoder_rejects_invalid_token():
    assert deps.decode_token_email(
        "not-a-jwt"
    ) is None


def test_inactive_account_token_is_rejected(
    monkeypatch,
):
    user = make_user(is_active=False)
    token = create_access_token(
        {"sub": user.email}
    )

    monkeypatch.setattr(
        deps.crud_user,
        "get_user_by_email",
        lambda *_args, **_kwargs: user,
    )

    with pytest.raises(HTTPException) as exc:
        deps.get_current_user(
            db=FakeDatabase(),
            token=token,
        )

    assert exc.value.status_code == 401


def test_optional_auth_ignores_inactive_account(
    monkeypatch,
):
    user = make_user(is_active=False)
    token = create_access_token(
        {"sub": user.email}
    )

    monkeypatch.setattr(
        deps.crud_user,
        "get_user_by_email",
        lambda *_args, **_kwargs: user,
    )

    assert deps.get_current_user_optional(
        db=FakeDatabase(),
        token=token,
    ) is None
