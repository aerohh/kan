#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$PROJECT_DIR/.env"

CONTAINER_NAME="${DB_CONTAINER:-kan-dev-db}"
DB_NAME="${POSTGRES_DB:-kan_db}"
DB_USER="${POSTGRES_USER:-kan}"
BACKUP_DIR="$PROJECT_DIR/backups"

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  (none)"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "File not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will drop and recreate the '$DB_NAME' database!"
echo "Container: $CONTAINER_NAME"
echo "Backup:    $BACKUP_FILE"
echo ""
read -p "Are you sure? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Terminating active connections..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
  2>/dev/null || true

echo "Recreating database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

echo "Restoring backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"

echo "Restore complete."
