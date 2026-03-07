#!/bin/bash

echo "Waiting for PostgreSQL..."
python << END
import sys
import time
import psycopg2
from os import environ

for i in range(30):
    try:
        conn = psycopg2.connect(
            host=environ.get('DB_HOST'),
            user=environ.get('DB_USER'),
            password=environ.get('DB_PASSWORD'),
            dbname=environ.get('DB_NAME'),
            port=int(environ.get('DB_PORT', 5432))
        )
        conn.close()
        print("PostgreSQL is ready!")
        sys.exit(0)
    except:
        print(f"Waiting for PostgreSQL... ({i+1}/30)")
        time.sleep(2)

print("PostgreSQL not available")
sys.exit(1)
END

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Seeding test customers..."
python manage.py seed_customers

echo "Starting server with Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 customer_service.wsgi:application
