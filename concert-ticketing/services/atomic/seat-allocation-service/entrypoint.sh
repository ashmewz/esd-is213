#!/bin/sh
set -e

echo "[entrypoint] Running migrate.py..."
python /app/migrate.py

echo "[entrypoint] Starting app..."
exec python app.py