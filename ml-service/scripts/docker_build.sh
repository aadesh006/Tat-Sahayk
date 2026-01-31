#!/bin/bash

echo "Building Tat-Sahayk ML Service Docker Image"

docker-compose build ml-service

echo " Build complete"

docker images | grep tat-sahayk