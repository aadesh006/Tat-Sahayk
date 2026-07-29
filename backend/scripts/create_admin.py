import argparse
import getpass
import os
import sys
from pathlib import Path
from typing import Optional

from email_validator import (
    EmailNotValidError,
    validate_email,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


import app.db.base  # noqa: E402,F401
from app.core.security import get_password_hash  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402


MINIMUM_PASSWORD_LENGTH = 12


def normalize_admin_email(email: str) -> str:
    try:
        result = validate_email(
            email.strip(),
            check_deliverability=False,
        )
    except EmailNotValidError as exc:
        raise ValueError(
            f"Invalid administrator email: {exc}"
        ) from exc

    return result.normalized.lower()


def validate_admin_password(password: str) -> str:
    if len(password) < MINIMUM_PASSWORD_LENGTH:
        raise ValueError(
            "Administrator password must contain at least "
            f"{MINIMUM_PASSWORD_LENGTH} characters"
        )

    requirements = {
        "an uppercase letter": any(
            character.isupper()
            for character in password
        ),
        "a lowercase letter": any(
            character.islower()
            for character in password
        ),
        "a number": any(
            character.isdigit()
            for character in password
        ),
        "a special character": any(
            not character.isalnum()
            for character in password
        ),
    }

    missing = [
        description
        for description, satisfied
        in requirements.items()
        if not satisfied
    ]

    if missing:
        raise ValueError(
            "Administrator password must contain "
            + ", ".join(missing)
        )

    return password


def resolve_admin_scope(
    *,
    national: bool,
    district: Optional[str],
    state: Optional[str],
) -> tuple[Optional[str], Optional[str]]:
    if national:
        return None, None

    normalized_district = (
        district.strip()
        if district and district.strip()
        else None
    )
    normalized_state = (
        state.strip()
        if state and state.strip()
        else None
    )

    if not normalized_district or not normalized_state:
        raise ValueError(
            "Provide both --district and --state, "
            "or use --national"
        )

    return normalized_district, normalized_state


def read_admin_password(
    *,
    environment_variable: str,
    non_interactive: bool,
) -> str:
    environment_password = os.getenv(
        environment_variable
    )

    if environment_password:
        return validate_admin_password(
            environment_password
        )

    if non_interactive:
        raise ValueError(
            f"{environment_variable} must be set "
            "in non-interactive mode"
        )

    password = getpass.getpass(
        "Administrator password: "
    )
    confirmation = getpass.getpass(
        "Confirm administrator password: "
    )

    if password != confirmation:
        raise ValueError(
            "Administrator passwords do not match"
        )

    return validate_admin_password(password)


def provision_admin(
    *,
    db,
    email: str,
    full_name: str,
    password: str,
    district: Optional[str],
    state: Optional[str],
    update_existing: bool,
) -> tuple[str, User]:
    existing = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing and not update_existing:
        raise ValueError(
            "An account with this email already exists. "
            "Use --update-existing to explicitly convert "
            "or update it."
        )

    hashed_password = get_password_hash(password)

    if existing:
        admin = existing
        action = "updated"
    else:
        admin = User(email=email)
        db.add(admin)
        action = "created"

    admin.full_name = full_name
    admin.hashed_password = hashed_password
    admin.role = "admin"
    admin.district = district
    admin.state = state
    admin.is_active = True

    db.commit()
    db.refresh(admin)

    return action, admin


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Securely provision one Tat-Sahayk "
            "administrator account."
        )
    )

    parser.add_argument(
        "--email",
        default=os.getenv("ADMIN_EMAIL"),
        help="Administrator email address",
    )
    parser.add_argument(
        "--full-name",
        default=os.getenv("ADMIN_FULL_NAME"),
        help="Administrator display name",
    )
    parser.add_argument(
        "--district",
        default=os.getenv("ADMIN_DISTRICT"),
        help="District-level administrator district",
    )
    parser.add_argument(
        "--state",
        default=os.getenv("ADMIN_STATE"),
        help="District-level administrator state",
    )
    parser.add_argument(
        "--national",
        action="store_true",
        help="Create a national administrator",
    )
    parser.add_argument(
        "--update-existing",
        action="store_true",
        help=(
            "Explicitly update an account that already "
            "uses this email"
        ),
    )
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help=(
            "Do not prompt; read the password from "
            "the configured environment variable"
        ),
    )
    parser.add_argument(
        "--password-env",
        default="ADMIN_PASSWORD",
        help=(
            "Environment variable containing the password "
            "for non-interactive provisioning"
        ),
    )

    return parser


def main() -> int:
    parser = build_parser()
    arguments = parser.parse_args()

    if not arguments.email:
        parser.error(
            "--email or ADMIN_EMAIL is required"
        )

    if (
        not arguments.full_name
        or not arguments.full_name.strip()
    ):
        parser.error(
            "--full-name or ADMIN_FULL_NAME is required"
        )

    try:
        email = normalize_admin_email(
            arguments.email
        )
        district, state = resolve_admin_scope(
            national=arguments.national,
            district=arguments.district,
            state=arguments.state,
        )
        password = read_admin_password(
            environment_variable=(
                arguments.password_env
            ),
            non_interactive=(
                arguments.non_interactive
            ),
        )
    except ValueError as exc:
        parser.error(str(exc))

    db = SessionLocal()

    try:
        action, admin = provision_admin(
            db=db,
            email=email,
            full_name=arguments.full_name.strip(),
            password=password,
            district=district,
            state=state,
            update_existing=(
                arguments.update_existing
            ),
        )
    except Exception as exc:
        db.rollback()
        print(
            f"Administrator provisioning failed: {exc}",
            file=sys.stderr,
        )
        return 1
    finally:
        db.close()

    if district and state:
        scope = f"{district}, {state}"
    else:
        scope = "national"

    print(
        f"Administrator {action}: {admin.email}"
    )
    print(f"Access scope: {scope}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
