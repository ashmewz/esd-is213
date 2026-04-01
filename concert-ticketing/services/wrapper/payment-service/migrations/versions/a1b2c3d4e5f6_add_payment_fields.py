"""add payment fields

Revision ID: a1b2c3d4e5f6
Revises: d5e0b09eeb30
Create Date: 2026-03-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'd5e0b09eeb30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change order_id from UUID to Text to accept plain string IDs
    op.alter_column(
        'transactions', 'order_id',
        existing_type=sa.UUID(),
        type_=sa.Text(),
        schema='payment_service'
    )

    op.add_column('transactions',
        sa.Column('user_id', sa.Text(), nullable=True),
        schema='payment_service'
    )
    op.add_column('transactions',
        sa.Column('idempotency_key', sa.Text(), nullable=True),
        schema='payment_service'
    )
    op.add_column('transactions',
        sa.Column('failure_reason', sa.Text(), nullable=True),
        schema='payment_service'
    )
    op.add_column('transactions',
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        schema='payment_service'
    )
    op.create_unique_constraint(
        'uq_transactions_idempotency_key',
        'transactions',
        ['idempotency_key'],
        schema='payment_service'
    )

    # Change order_id in payment_ledger from UUID to Text as well
    op.alter_column(
        'payment_ledger', 'order_id',
        existing_type=sa.UUID(),
        type_=sa.Text(),
        schema='payment_service'
    )


def downgrade() -> None:
    op.drop_constraint(
        'uq_transactions_idempotency_key',
        'transactions',
        schema='payment_service'
    )
    op.drop_column('transactions', 'updated_at', schema='payment_service')
    op.drop_column('transactions', 'failure_reason', schema='payment_service')
    op.drop_column('transactions', 'idempotency_key', schema='payment_service')
    op.drop_column('transactions', 'user_id', schema='payment_service')

    op.alter_column(
        'transactions', 'order_id',
        existing_type=sa.Text(),
        type_=sa.UUID(),
        schema='payment_service'
    )
    op.alter_column(
        'payment_ledger', 'order_id',
        existing_type=sa.Text(),
        type_=sa.UUID(),
        schema='payment_service'
    )
