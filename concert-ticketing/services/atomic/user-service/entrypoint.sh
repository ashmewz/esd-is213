#!/bin/sh
# entrypoint.sh — runs DB migrations then starts the Flask app.
# Executed as the container CMD; schema creation is idempotent.
set -e

echo "[entrypoint] Creating schema 'user_service' if it does not exist..."
python - <<'PYEOF'
import os
from sqlalchemy import create_engine, text
engine = create_engine(os.environ["DATABASE_URL"])
with engine.connect() as c:
    c.execute(text("CREATE SCHEMA IF NOT EXISTS user_service"))
    c.commit()
print("[entrypoint] Schema ready.")
PYEOF

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

echo "[entrypoint] Starting application..."
exec python app.py