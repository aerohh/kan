# AGENTS.infra.md

Instructions for infrastructure, Docker, deployment, and environment configuration.

## File Locations

- Production compose: `docker-compose.yml`
- Development compose: `docker-compose.dev.yml` (hot-reloading enabled)
- Web Dockerfile: `apps/web/Dockerfile`
- Cloud compose: `cloud/docker-compose.yml`

## Docker Commands

**Production (default `docker-compose.yml`)**: Runs pre-built production image. Changes require rebuilding.
- `docker compose up` - Start all services (web, database, etc.)
- `docker compose down` - Stop all services
- `docker compose up --build` - Rebuild and start services
- `docker compose logs -f web` - Follow web service logs

**Development (`docker-compose.dev.yml`)**: Database and migrate services only (dev server runs locally).
- `docker compose -f docker-compose.dev.yml up postgres -d` - Start database
- `docker compose -f docker-compose.dev.yml --profile migrate up migrate` - Run migrations
- `docker compose -f docker-compose.dev.yml down` - Stop dev services

**Container naming**:
- Development: `kan-dev-db`, `kan-dev-migrate`, `kan-dev-backup`, `kan-dev-network`
- Production: `kan-db`, `kan-migrate`, `kan-network`

## Database Backups

### Manual Backup & Restore

- `./scripts/backup-db.sh` — runs `pg_dump` via `docker exec` against the running DB container, saves gzipped SQL to `backups/`
- `./scripts/restore-db.sh <file.sql.gz>` — drops/recreates the database and restores from backup (prompts for confirmation)
- Backups are stored in `backups/` (gitignored)
- Auto-cleanup keeps last 10 backups (configurable via `KEEP_BACKUPS` env var)
- Container name defaults to `kan-dev-db` (overridable via `DB_CONTAINER` env var)

### Scheduled Backup Service

- A `backup` service in `docker-compose.dev.yml` runs `pg_dump` on a schedule inside a sidecar container
- Start: `docker compose -f docker-compose.dev.yml up backup -d`
- Logs: `docker logs -f kan-dev-backup`
- Configurable via env vars:
  - `BACKUP_INTERVAL` — seconds between backups (default: `86400` = 24h)
  - `KEEP_BACKUPS` — number of backups to retain (default: `7`)
- Backups stored in Docker volume `kan-dev-backup-data`

## Development Workflow (Recommended)

For active development with hot reloading:

```bash
# Terminal 1: Start database in Docker
docker compose -f docker-compose.dev.yml up postgres -d

# Terminal 2: Run dev server locally (connects to Docker database)
npx pnpm dev
```

The database runs in Docker and persists data in the `kan-dev-postgres-data` volume. The dev server connects via `localhost:5432` as defined in `POSTGRES_URL`.

**POSTGRES_URL configuration**:
- Local dev: Use `localhost` as hostname (e.g., `postgresql://user:pass@localhost:5432/db`)
- Docker (production): Use `postgres` as hostname (e.g., `postgresql://user:pass@postgres:5432/db`)

**Run migrations**:
```bash
docker compose -f docker-compose.dev.yml --profile migrate up migrate
```

**WARNING**: Do not run `docker compose -f docker-compose.dev.yml` commands when the production `docker-compose.yml` is also in use. Both share the project name "kan" and Docker may recreate production containers, potentially causing data loss. Always check `docker ps` first to see what's running.

## Adding a New Environment Variable

Update all of the following:

1. `.env.example` — add the variable with an empty value and a comment explaining it
2. `turbo.json` — add to `globalEnv` (or `globalPassThroughEnv` for CI/platform vars)
3. `docker-compose.yml` — add to the `web` service `environment` section
4. `docker-compose.dev.yml` — add to the `web` service `environment` section
5. `cloud/docker-compose.yml` — add to the `web` service `environment` section
6. `README.md` — add a row to the Environment Variables table
