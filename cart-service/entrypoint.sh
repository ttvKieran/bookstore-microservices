#!/bin/bash

echo "Waiting for MySQL..."
python << END
import sys
import time
import MySQLdb
from os import environ

for i in range(30):
    try:
        conn = MySQLdb.connect(
            host=environ.get('DB_HOST'),
            user=environ.get('DB_USER'),
            password=environ.get('DB_PASSWORD'),
            port=int(environ.get('DB_PORT', 3306))
        )
        conn.close()
        print("MySQL is ready!")
        sys.exit(0)
    except:
        print(f"Waiting for MySQL... ({i+1}/30)")
        time.sleep(2)

print("MySQL not available")
sys.exit(1)
END

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Starting server..."
python manage.py runserver 0.0.0.0:8000
