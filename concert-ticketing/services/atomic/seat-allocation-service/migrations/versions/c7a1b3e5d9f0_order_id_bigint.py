"""order_id BIGINT for OutSystems long integer order IDs

Revision ID: c7a1b3e5d9f0
Revises: 38d0f225e115
Create Date: 2026-04-04

Existing UUID order_id values cannot be converted to BIGINT. This migration
truncates holds-related data before altering column types. Do not run on a
database where you need to preserve existing UUID order_ids.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7a1b3e5d9f0"
down_revision: Union[str, Sequence[str], None] = "38d0f225e115"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "seat_allocation_service"

# Postgres default name for unnamed composite FK from initial migration
COMPOSITE_FK_NAME = "seat_assignments_event_id_seat_id_order_id_fkey"


def upgrade() -> None:
    op.drop_constraint(
        COMPOSITE_FK_NAME,
        "seat_assignments",
        schema=SCHEMA,
        type_="foreignkey",
    )
    op.execute(sa.text(f"TRUNCATE TABLE {SCHEMA}.reallocation_logs"))
    op.execute(sa.text(f"TRUNCATE TABLE {SCHEMA}.holds CASCADE"))

    for table in ("holds", "seat_assignments", "reallocation_logs"):
        op.alter_column(
            table,
            "order_id",
            schema=SCHEMA,
            existing_type=sa.UUID(),
            type_=sa.BigInteger(),
            existing_nullable=False,
            nullable=False,
            postgresql_using="0::bigint",
        )

    op.create_foreign_key(
        COMPOSITE_FK_NAME,
        "seat_assignments",
        "holds",
        ["event_id", "seat_id", "order_id"],
        ["event_id", "seat_id", "order_id"],
        source_schema=SCHEMA,
        referent_schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_constraint(
        COMPOSITE_FK_NAME,
        "seat_assignments",
        schema=SCHEMA,
        type_="foreignkey",
    )
    op.execute(sa.text(f"TRUNCATE TABLE {SCHEMA}.reallocation_logs"))
    op.execute(sa.text(f"TRUNCATE TABLE {SCHEMA}.holds CASCADE"))

    for table in ("holds", "seat_assignments", "reallocation_logs"):
        op.alter_column(
            table,
            "order_id",
            schema=SCHEMA,
            existing_type=sa.BigInteger(),
            type_=sa.UUID(),
            existing_nullable=False,
            nullable=False,
            postgresql_using="gen_random_uuid()",
        )

    op.create_foreign_key(
        COMPOSITE_FK_NAME,
        "seat_assignments",
        "holds",
        ["event_id", "seat_id", "order_id"],
        ["event_id", "seat_id", "order_id"],
        source_schema=SCHEMA,
        referent_schema=SCHEMA,
    )
