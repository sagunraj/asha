#!/bin/sh
set -e

echo "Initializing database..."
python -c "from app.init_db import init_db; init_db()"

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
