"""drop payment_ledger table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the foreign key constraint first, then the table
    op.drop_table('payment_ledger', schema='payment_service')


def downgrade() -> None:
    # Recreate payment_ledger if rolling back
    op.create_table(
        'payment_ledger',
        sa.Column('ledger_id', sa.UUID(), nullable=False),
        sa.Column('order_id', sa.Text(), nullable=False),
        sa.Column('transaction_id', sa.UUID(), nullable=True),
        sa.Column('entry_type', sa.Text(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.CheckConstraint("entry_type IN ('DEBIT','CREDIT')", name='check_entry_type'),
        sa.ForeignKeyConstraint(
            ['transaction_id'],
            ['payment_service.transactions.transaction_id'],
        ),
        sa.PrimaryKeyConstraint('ledger_id'),
        schema='payment_service'
    )
