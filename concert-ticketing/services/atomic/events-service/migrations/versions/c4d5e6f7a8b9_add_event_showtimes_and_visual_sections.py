"""add event showtimes, visual sections, and missing event fields

Revision ID: c4d5e6f7a8b9
Revises: f1a2b3c4d5e6
Create Date: 2026-04-04
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "events_service"


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(
        text(
            f"""
            ALTER TABLE {SCHEMA}.events
            ADD COLUMN IF NOT EXISTS event_timing VARCHAR NOT NULL DEFAULT ''
            """
        )
    )

    conn.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS {SCHEMA}.event_showtimes (
                showtime_id UUID PRIMARY KEY,
                event_id UUID NOT NULL,
                date_id DATE NOT NULL,
                label VARCHAR NOT NULL,
                times JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            )
            """
        )
    )

    conn.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS {SCHEMA}.event_visual_sections (
                visual_section_id UUID PRIMARY KEY,
                event_id UUID NOT NULL,
                section_code VARCHAR NOT NULL,
                label VARCHAR NOT NULL,
                data_section INTEGER NOT NULL,
                x NUMERIC(10,2) NOT NULL,
                y NUMERIC(10,2) NOT NULL,
                w NUMERIC(10,2) NOT NULL,
                h NUMERIC(10,2) NOT NULL,
                multiline BOOLEAN NOT NULL DEFAULT FALSE,
                hidden BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            )
            """
        )
    )


def downgrade() -> None:
    op.execute(text(f"DROP TABLE IF EXISTS {SCHEMA}.event_visual_sections"))
    op.execute(text(f"DROP TABLE IF EXISTS {SCHEMA}.event_showtimes"))
    op.execute(text(f"ALTER TABLE {SCHEMA}.events DROP COLUMN IF EXISTS event_timing"))
