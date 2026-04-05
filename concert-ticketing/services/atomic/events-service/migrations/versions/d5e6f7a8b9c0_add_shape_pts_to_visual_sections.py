"""add shape and pts to event_visual_sections, make x/y/w/h nullable

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-04-05
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "events_service"


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(text(f"""
        ALTER TABLE {SCHEMA}.event_visual_sections
        ADD COLUMN IF NOT EXISTS shape VARCHAR,
        ADD COLUMN IF NOT EXISTS pts JSONB
    """))

    conn.execute(text(f"""
        ALTER TABLE {SCHEMA}.event_visual_sections
        ALTER COLUMN x DROP NOT NULL,
        ALTER COLUMN y DROP NOT NULL,
        ALTER COLUMN w DROP NOT NULL,
        ALTER COLUMN h DROP NOT NULL
    """))


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(text(f"""
        ALTER TABLE {SCHEMA}.event_visual_sections
        DROP COLUMN IF EXISTS shape,
        DROP COLUMN IF EXISTS pts
    """))

    conn.execute(text(f"""
        UPDATE {SCHEMA}.event_visual_sections
        SET x = 0 WHERE x IS NULL
    """))
    conn.execute(text(f"""
        UPDATE {SCHEMA}.event_visual_sections
        SET y = 0 WHERE y IS NULL
    """))
    conn.execute(text(f"""
        UPDATE {SCHEMA}.event_visual_sections
        SET w = 0 WHERE w IS NULL
    """))
    conn.execute(text(f"""
        UPDATE {SCHEMA}.event_visual_sections
        SET h = 0 WHERE h IS NULL
    """))

    conn.execute(text(f"""
        ALTER TABLE {SCHEMA}.event_visual_sections
        ALTER COLUMN x SET NOT NULL,
        ALTER COLUMN y SET NOT NULL,
        ALTER COLUMN w SET NOT NULL,
        ALTER COLUMN h SET NOT NULL
    """))
