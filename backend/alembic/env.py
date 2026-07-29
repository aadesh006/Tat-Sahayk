from logging.config import fileConfig

from alembic import context

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine


config = context.config

if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_object(
    object_,
    name,
    type_,
    reflected,
    compare_to,
):
    # PostGIS owns this table; application migrations must not modify it.
    if type_ == "table" and name == "spatial_ref_sys":
        return False

    return True


def run_migrations_offline() -> None:
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()