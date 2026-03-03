#!/bin/bash

echo "Waiting for services to be ready..."
sleep 5

echo "Starting API Gateway..."
python manage.py runserver 0.0.0.0:8000
