import os
import random
import subprocess
import time
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

# Stagger startup to avoid hitting Supabase connection limit when all
# services start simultaneously.
time.sleep(random.uniform(0, 4))

DATABASE_URL = os.environ["DATABASE_URL"]
SCHEMA = "swap_service"

print(f"[migrate] Creating schema {SCHEMA}...")
engine = create_engine(DATABASE_URL, poolclass=NullPool)
with engine.connect() as conn:
    conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}"))
    conn.commit()
engine.dispose()

# Detect state and reconcile alembic_version table before running migrations.
# Known revisions in this codebase (in order):
#   0ecaf9edae92 -> e70d47b4c9ff -> 1ba600a6fd99 -> b2c3d4e5f6a7 (head)
KNOWN_REVISIONS = {"0ecaf9edae92", "e70d47b4c9ff", "1ba600a6fd99", "b2c3d4e5f6a7"}
# Revision just before our new migration — all prior tables already exist at this point
PRE_EXISTING_HEAD = "1ba600a6fd99"

engine3 = create_engine(DATABASE_URL, poolclass=NullPool)
with engine3.connect() as conn:
    try:
        # Check whether the base tables exist (swap_requests was created in 0ecaf9edae92)
        tables_exist = conn.execute(
            text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'swap_service' AND table_name = 'swap_requests')"
            )
        ).scalar()

        # Get current alembic revision(s)
        try:
            rows = conn.execute(
                text("SELECT version_num FROM swap_service.alembic_version")
            ).fetchall()
            current = {r[0] for r in rows}
        except Exception:
            current = set()

        stale = current - KNOWN_REVISIONS
        if stale:
            print(f"[migrate] Removing stale revisions: {stale}")
            for rev in stale:
                conn.execute(
                    text(
                        "DELETE FROM swap_service.alembic_version WHERE version_num = :rev"
                    ),
                    {"rev": rev},
                )
            conn.commit()
            # Re-read after deletion
            rows = conn.execute(
                text("SELECT version_num FROM swap_service.alembic_version")
            ).fetchall()
            current = {r[0] for r in rows}

        if tables_exist and not current:
            # Tables exist but no revision recorded.
            # Check if user_id column already exists (added by PR branch or our migration).
            user_id_exists = conn.execute(
                text(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                    "WHERE table_schema = 'swap_service' AND table_name = 'swap_requests' "
                    "AND column_name = 'user_id')"
                )
            ).scalar()
            stamp_rev = "b2c3d4e5f6a7" if user_id_exists else PRE_EXISTING_HEAD
            print(
                f"[migrate] Tables exist but no revision; stamping to {stamp_rev}"
            )
            conn.execute(
                text(
                    "INSERT INTO swap_service.alembic_version (version_num) VALUES (:rev)"
                ),
                {"rev": stamp_rev},
            )
            conn.commit()

    except Exception as e:
        print(f"[migrate] Version check error (non-fatal): {e}")
engine3.dispose()

# print("[migrate] Running alembic upgrade head...")
# subprocess.run(["alembic", "upgrade", "head"], check=True)
