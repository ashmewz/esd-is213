"""add user_id and current_tier to swap_requests

Revision ID: a1b2c3d4e5f6
Revises: 1ba600a6fd99
Create Date: 2026-04-04
"""
from typing import Union, Sequence
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "1ba600a6fd99"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE swap_service.swap_requests ADD COLUMN IF NOT EXISTS user_id UUID")
    op.execute("ALTER TABLE swap_service.swap_requests ADD COLUMN IF NOT EXISTS current_tier VARCHAR(20)")


def downgrade() -> None:
    op.execute("ALTER TABLE swap_service.swap_requests DROP COLUMN IF EXISTS user_id")
    op.execute("ALTER TABLE swap_service.swap_requests DROP COLUMN IF EXISTS current_tier")
