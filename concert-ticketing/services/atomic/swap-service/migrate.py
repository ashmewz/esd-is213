import os
import subprocess
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ["DATABASE_URL"]
SCHEMA = "swap_service"

print(f"[migrate] Creating schema {SCHEMA}...")
engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}"))
    conn.commit()

print("[migrate] Running alembic upgrade head...")
subprocess.run(["alembic", "upgrade", "head"], check=True)
