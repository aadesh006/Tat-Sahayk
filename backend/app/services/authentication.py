"""Authentication helpers that do not depend on HTTP or database state."""

from secrets import token_urlsafe

from app.core.security import verify_password


LEGACY_GOOGLE_PASSWORD_SENTINEL = (
    "google_oauth_no_password"
)


def generate_unusable_password() -> str:
    """
    Generate high-entropy password material for an OAuth-only account.

    The value is hashed immediately by the normal user-creation path
    and is never returned to a user or persisted in plaintext.
    """
    return token_urlsafe(48)


def uses_legacy_google_password(
    hashed_password: str,
) -> bool:
    """
    Detect accounts created with the old shared Google placeholder.

    This check allows password login to reject those accounts and lets
    a successful Google login rotate the hash transparently.
    """
    if not hashed_password:
        return False

    try:
        return verify_password(
            LEGACY_GOOGLE_PASSWORD_SENTINEL,
            hashed_password,
        )
    except (TypeError, ValueError):
        return False
