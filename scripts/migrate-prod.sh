#!/bin/bash

# Production database migration script
# Safely runs Prisma migrations in production environment

set -e  # Exit on error

echo "🚀 Starting production database migration..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is not set"
    exit 1
fi

# Backup current database (optional but recommended)
if [ "$BACKUP_BEFORE_MIGRATION" = "true" ]; then
    echo "📦 Creating database backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backups/db_backup_${TIMESTAMP}.sql"
    mkdir -p backups
    
    # Extract database connection details
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    
    pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE
    echo "✅ Backup created: $BACKUP_FILE"
fi

# Run Prisma migrations
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

# Verify migration status
echo "🔍 Checking migration status..."
npx prisma migrate status

# Generate Prisma client
echo "🏗️ Generating Prisma client..."
npx prisma generate

# Run data validation (optional)
if [ "$VALIDATE_AFTER_MIGRATION" = "true" ]; then
    echo "✔️ Running data validation..."
    node scripts/validate-migration.js
fi

echo "✅ Production database migration completed successfully!"

# Send notification (optional)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Database migration completed successfully on $(hostname)\"}" \
        $SLACK_WEBHOOK_URL
fi