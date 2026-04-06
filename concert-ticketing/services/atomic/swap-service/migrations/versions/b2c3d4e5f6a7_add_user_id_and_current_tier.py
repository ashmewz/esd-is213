"""add user_id and current_tier to swap_requests

Revision ID: b2c3d4e5f6a7
Revises: 0ecaf9edae92
Create Date: 2026-04-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = '1ba600a6fd99'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add user_id and current_tier columns to swap_requests (idempotent)."""
    # Use raw SQL with IF NOT EXISTS to handle cases where the column
    # was already added by a prior deployment (e.g. from a feature branch).
    op.execute(
        "ALTER TABLE swap_service.swap_requests "
        "ADD COLUMN IF NOT EXISTS user_id UUID"
    )
    op.execute(
        "ALTER TABLE swap_service.swap_requests "
        "ADD COLUMN IF NOT EXISTS current_tier VARCHAR(20)"
    )


def downgrade() -> None:
    """Remove user_id and current_tier columns from swap_requests."""
    op.drop_column('swap_requests', 'current_tier', schema='swap_service')
    op.drop_column('swap_requests', 'user_id', schema='swap_service')
