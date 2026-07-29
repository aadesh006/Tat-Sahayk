#!/bin/sh
set -eu

echo "Applying database migrations..."
alembic upgrade head

echo "Starting Tat-Sahayk backend..."
exec uvicorn app.main:app \
    --host "${HOST:-0.0.0.0}" \
    --port "${PORT:-5001}" \
    "$@"