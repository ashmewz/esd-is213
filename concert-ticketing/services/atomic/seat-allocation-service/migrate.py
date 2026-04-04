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
SCHEMA = "seat_allocation_service"

print(f"[migrate] Creating schema {SCHEMA}...")
engine = create_engine(DATABASE_URL, poolclass=NullPool)
with engine.connect() as conn:
    conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}"))
    conn.commit()
engine.dispose()

# print("[migrate] Running alembic upgrade head...")
# subprocess.run(["alembic", "upgrade", "head"], check=True)
