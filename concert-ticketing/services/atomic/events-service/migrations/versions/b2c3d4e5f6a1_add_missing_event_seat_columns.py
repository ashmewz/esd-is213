"""add missing columns to events and seats tables

Revision ID: b2c3d4e5f6a1
Revises: 83955263e287
Create Date: 2026-04-04

Adds columns present in the ORM models but missing from the initial migration:
  events: venue_name, event_date_display, seatmap, min_price, image_url
  seats:  status
Uses IF NOT EXISTS so this is safe to run even if columns already exist.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision: str = "b2c3d4e5f6a1"
down_revision: Union[str, Sequence[str], None] = "83955263e287"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "events_service"


def upgrade() -> None:
    conn = op.get_bind()
    cols = [
        ("events", "venue_name", "VARCHAR"),
        ("events", "event_date_display", "VARCHAR"),
        ("events", "seatmap", "INTEGER"),
        ("events", "min_price", "NUMERIC(10,2)"),
        ("events", "image_url", "VARCHAR"),
        ("seats",  "status", "VARCHAR(20) DEFAULT 'available'"),
    ]
    for table, col, col_type in cols:
        conn.execute(text(
            f"ALTER TABLE {SCHEMA}.{table} ADD COLUMN IF NOT EXISTS {col} {col_type}"
        ))


def downgrade() -> None:
    op.drop_column("events", "venue_name", schema=SCHEMA)
    op.drop_column("events", "event_date_display", schema=SCHEMA)
    op.drop_column("events", "seatmap", schema=SCHEMA)
    op.drop_column("events", "min_price", schema=SCHEMA)
    op.drop_column("events", "image_url", schema=SCHEMA)
    op.drop_column("seats", "status", schema=SCHEMA)
