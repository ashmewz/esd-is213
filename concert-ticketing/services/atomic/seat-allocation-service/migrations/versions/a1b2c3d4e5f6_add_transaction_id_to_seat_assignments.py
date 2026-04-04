"""add transaction_id to seat_assignments

Revision ID: a1b2c3d4e5f6
Revises: c7a1b3e5d9f0
Create Date: 2026-04-04

Stores the payment transaction_id (from payment-service) on the
seat_assignment row so there is a direct link from seat → payment
for refund processing in Scenario B.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "c7a1b3e5d9f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "seat_allocation_service"


def upgrade() -> None:
    op.add_column(
        "seat_assignments",
        sa.Column("transaction_id", sa.String(100), nullable=True),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_column("seat_assignments", "transaction_id", schema=SCHEMA)
