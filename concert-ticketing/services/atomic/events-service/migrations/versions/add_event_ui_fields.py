"""add venue_name image_url dates to events

Revision ID: add_event_ui_fields
Revises: 83955263e287
Create Date: 2026-04-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'add_event_ui_fields'
down_revision: Union[str, Sequence[str], None] = '83955263e287'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('events', sa.Column('venue_name', sa.String(), nullable=True), schema='events_service')
    op.add_column('events', sa.Column('image_url',  sa.String(), nullable=True), schema='events_service')
    op.add_column('events', sa.Column('dates',      JSONB(),     nullable=True), schema='events_service')


def downgrade() -> None:
    op.drop_column('events', 'dates',      schema='events_service')
    op.drop_column('events', 'image_url',  schema='events_service')
    op.drop_column('events', 'venue_name', schema='events_service')
