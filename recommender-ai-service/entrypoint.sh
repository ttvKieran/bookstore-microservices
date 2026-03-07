#!/bin/bash

echo "Waiting for PostgreSQL..."
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  sleep 1
done

echo "PostgreSQL started"

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Starting server with Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 recommender_service.wsgi:application
