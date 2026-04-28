#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"

source "$PROJECT_DIR/.env"

CONTAINER_NAME="${DB_CONTAINER:-kan-dev-db}"
DB_NAME="${POSTGRES_DB:-kan_db}"
DB_USER="${POSTGRES_USER:-kan}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up '$DB_NAME' from container '$CONTAINER_NAME'..."

docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=plain --no-owner --no-privileges \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup saved: $BACKUP_FILE ($SIZE)"

KEEP=${KEEP_BACKUPS:-10}
TOTAL=$(ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
if [ "$TOTAL" -gt "$KEEP" ]; then
  COUNT=$((TOTAL - KEEP))
  echo "Cleaning up $COUNT old backup(s)..."
  ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz | tail -n "$COUNT" | xargs rm -f
fi

echo "Done. $KEEP most recent backups retained."
