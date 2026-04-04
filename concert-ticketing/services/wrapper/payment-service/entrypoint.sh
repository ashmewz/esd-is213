#!/bin/sh
# entrypoint.sh — runs DB migrations then starts the Flask app.
# Executed as the container CMD; schema creation is idempotent.
set -e

# Stagger startup to avoid hitting Supabase connection limit
python - <<'PYEOF'
import random, time
time.sleep(random.uniform(0, 4))
PYEOF

echo "[entrypoint] Creating schema 'payment_service' if it does not exist..."
python - <<'PYEOF'
import os
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
engine = create_engine(os.environ["DATABASE_URL"], poolclass=NullPool)
with engine.connect() as c:
    c.execute(text("CREATE SCHEMA IF NOT EXISTS payment_service"))
    c.commit()
engine.dispose()
print("[entrypoint] Schema ready.")
PYEOF

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

echo "[entrypoint] Starting application..."
exec python app.py
