#!/bin/bash

echo "Waiting for services to be ready..."
sleep 5

echo "Starting server with Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 api_gateway.wsgi:application
