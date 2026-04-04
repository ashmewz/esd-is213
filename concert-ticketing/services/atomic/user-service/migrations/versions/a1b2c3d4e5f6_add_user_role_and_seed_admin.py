"""add user role and seed default admin

Revision ID: a1b2c3d4e5f6
Revises: 0ac7a0db9fda
Create Date: 2026-04-04
"""
from typing import Sequence, Union

import os
import uuid

import bcrypt
from alembic import op
from sqlalchemy import text


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "0ac7a0db9fda"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SCHEMA = "user_service"
DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME")
DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD")


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            f"""
            ALTER TABLE {SCHEMA}.users
            ADD COLUMN IF NOT EXISTS role VARCHAR(20)
            """
        )
    )

    conn.execute(
        text(
            f"""
            UPDATE {SCHEMA}.users
            SET role = 'customer'
            WHERE role IS NULL OR TRIM(role) = ''
            """
        )
    )

    conn.execute(
        text(
            f"""
            ALTER TABLE {SCHEMA}.users
            ALTER COLUMN role SET DEFAULT 'customer'
            """
        )
    )

    if DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD:
        admin_exists = conn.execute(
            text(
                f"""
                SELECT 1
                FROM {SCHEMA}.users
                WHERE username = :username OR email = :email
                LIMIT 1
                """
            ),
            {"username": DEFAULT_ADMIN_USERNAME, "email": DEFAULT_ADMIN_EMAIL},
        ).scalar()

        if not admin_exists:
            password_hash = bcrypt.hashpw(
                DEFAULT_ADMIN_PASSWORD.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")
            conn.execute(
                text(
                    f"""
                    INSERT INTO {SCHEMA}.users (user_id, username, email, password, role)
                    VALUES (:user_id, :username, :email, :password, 'admin')
                    """
                ),
                {
                    "user_id": str(uuid.uuid4()),
                    "username": DEFAULT_ADMIN_USERNAME,
                    "email": DEFAULT_ADMIN_EMAIL,
                    "password": password_hash,
                },
            )


def downgrade() -> None:
    conn = op.get_bind()
    if DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_EMAIL:
        conn.execute(
            text(
                f"""
                DELETE FROM {SCHEMA}.users
                WHERE username = :username AND email = :email AND role = 'admin'
                """
            ),
            {"username": DEFAULT_ADMIN_USERNAME, "email": DEFAULT_ADMIN_EMAIL},
        )
    op.execute(text(f"ALTER TABLE {SCHEMA}.users DROP COLUMN IF EXISTS role"))
