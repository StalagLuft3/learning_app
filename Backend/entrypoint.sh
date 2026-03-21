#!/bin/sh
set -e

# Wait for Postgres to be ready using psql
echo "Waiting for Postgres to be ready..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
	echo "Postgres is unavailable - sleeping"
	sleep 2
done
echo "Postgres is up - continuing"

# Run Prisma migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Start the server
echo "Starting server..."
exec node server.js
