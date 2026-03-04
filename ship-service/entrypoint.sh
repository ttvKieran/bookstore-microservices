#!/bin/sh

echo "Starting Shipment Service..."

# Wait for PostgreSQL to be ready
until pg_isready -h ${DB_HOST:-postgres-shipment} -p ${DB_PORT:-5432} -U ${DB_USER:-shipment_user}; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready. Starting Spring Boot application..."

# Start the Spring Boot application
exec java -jar /app/app.jar
