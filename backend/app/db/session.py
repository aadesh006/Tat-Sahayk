from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


def build_engine_options() -> dict:
    """
    Build database-specific SQLAlchemy options.

    Local PostgreSQL generally does not use SSL. Hosted databases can set
    DATABASE_SSL_MODE=require or another PostgreSQL-supported mode.
    """
    database_url = make_url(settings.DATABASE_URL)
    backend_name = database_url.get_backend_name()

    connect_args: dict = {}
    engine_options: dict = {
        "pool_pre_ping": True,
    }

    if backend_name == "postgresql":
        if settings.DATABASE_SSL_MODE != "disable":
            connect_args["sslmode"] = settings.DATABASE_SSL_MODE

        engine_options.update(
            {
                "pool_size": settings.DATABASE_POOL_SIZE,
                "max_overflow": settings.DATABASE_MAX_OVERFLOW,
                "pool_recycle": 1800,
            }
        )

    elif backend_name == "sqlite":
        # SQLite is useful for lightweight tests, although production
        # geospatial functionality requires PostgreSQL with PostGIS.
        connect_args["check_same_thread"] = False

    engine_options["connect_args"] = connect_args
    return engine_options


engine = create_engine(
    settings.DATABASE_URL,
    **build_engine_options(),
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

Base = declarative_base()


def get_db():
    """Provide one database session per request."""
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()