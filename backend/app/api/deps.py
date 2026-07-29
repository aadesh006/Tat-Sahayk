from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import ALGORITHM
from app.crud import user as crud_user
from app.db.session import get_db
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login"
)
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)


def decode_token_email(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        return None

    email = payload.get("sub")

    if not isinstance(email, str) or not email:
        return None

    return email


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    email = decode_token_email(token)

    if email is None:
        raise credentials_exception

    user = crud_user.get_user_by_email(
        db,
        email=email,
    )

    if user is None or not user.is_active:
        raise credentials_exception

    return user


def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(
        oauth2_scheme_optional
    ),
) -> Optional[User]:
    if not token:
        return None

    email = decode_token_email(token)

    if email is None:
        return None

    user = crud_user.get_user_by_email(
        db,
        email=email,
    )

    if user is None or not user.is_active:
        return None

    return user
