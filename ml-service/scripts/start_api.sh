#!/bin/bash

echo "Starting Tat-Sahayk ML API"

source venv/bin/activate

export PYTHONPATH="${PYTHONPATH}:$(pwd)"

python src/api/routes/main.py