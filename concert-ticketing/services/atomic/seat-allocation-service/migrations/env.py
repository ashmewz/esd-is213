import os
import sys
from sqlalchemy import engine_from_config, pool, text
from alembic import context

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if os.getenv("ENV") != "production":
    from dotenv import load_dotenv
    load_dotenv()

config = context.config

db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL is not set")

config.set_main_option("sqlalchemy.url", db_url)

from app.core.database import Base
import app.models.seat_allocation_models  # noqa: F401 — registers all ORM models

target_metadata = Base.metadata

SCHEMA = "seat_allocation_service"


def include_object(object, name, type_, reflected, compare_to):
    """Only manage objects that belong to this service's schema."""
    if type_ == "table":
        return object.schema == SCHEMA
    return True


def run_migrations_offline():
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_schemas=True,
        include_object=include_object,
        version_table="alembic_version",
        version_table_schema=SCHEMA,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Ensure schema exists before Alembic tries to write its version table.
        # Safe to call repeatedly — CREATE SCHEMA IF NOT EXISTS is idempotent.
        connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}"))
        connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=True,
            include_object=include_object,
            version_table="alembic_version",
            version_table_schema=SCHEMA,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()