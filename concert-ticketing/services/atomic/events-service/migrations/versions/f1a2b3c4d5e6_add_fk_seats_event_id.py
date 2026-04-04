"""add foreign key from seats.event_id to events.event_id

Revision ID: f1a2b3c4d5e6
Revises: 83955263e287
Create Date: 2026-04-04

"""
from typing import Sequence, Union

from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "events_service"


def upgrade() -> None:
    from sqlalchemy import text
    conn = op.get_bind()
    conn.execute(text("""
        ALTER TABLE events_service.seats
        ADD CONSTRAINT fk_seats_event_id
        FOREIGN KEY (event_id) REFERENCES events_service.events(event_id)
        ON DELETE CASCADE
        NOT VALID
    """) if False else text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_seats_event_id'
            ) THEN
                ALTER TABLE events_service.seats
                ADD CONSTRAINT fk_seats_event_id
                FOREIGN KEY (event_id) REFERENCES events_service.events(event_id)
                ON DELETE CASCADE;
            END IF;
        END $$;
    """))


def downgrade() -> None:
    op.drop_constraint(
        "fk_seats_event_id",
        "seats",
        schema=SCHEMA,
        type_="foreignkey",
    )
