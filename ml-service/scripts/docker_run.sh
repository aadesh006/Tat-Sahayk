#!/bin/bash

echo "Starting Tat-Sahayk ML Service"

docker-compose up -d

echo " Services started"

docker-compose ps

echo ""
echo "Tailing logs (Ctrl+C to stop)..."
docker-compose logs -f ml-service