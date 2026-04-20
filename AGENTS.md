# AGENTS.md

## Purpose

This file is maintained to help AI agents work effectively on this project. After each significant task, important information (file locations, patterns, architectural decisions) should be added here to help future AI sessions start their research from the best leads.

## Project Overview

Kan is an open-source project management tool (Trello alternative) built with:

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: tRPC, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Monorepo**: pnpm workspaces with Turbo
- **Auth**: Better Auth
- **Internationalization**: Lingui

## Setup Commands

**Note**: This project uses `pnpm` via `npx` (not installed globally). All commands use `npx pnpm` instead of `pnpm`.

### Docker Commands

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
- Development: `kan-dev-db`, `kan-dev-migrate`, `kan-dev-network`
- Production: `kan-db`, `kan-migrate`, `kan-network`

### Development Workflow (Recommended)

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

### Common Commands

- Install deps: `npx pnpm install`
- Start dev server: `npx pnpm dev`
- Create migrations: `cd packages/db && npx pnpm drizzle-kit generate --name "AddFieldToTable"`
- Run database migrations: `npx pnpm db:migrate`
- Run linter: `npx pnpm lint`
- Run type check: `npx pnpm typecheck`
- Format code: `npx pnpm format:fix`
- Extract i18n strings: `npx pnpm lingui:extract`

## Project Structure

- `apps/web/` - Next.js web application
- `packages/api/` - tRPC API routers
- `packages/db/` - Database schema, migrations, and repositories
- `packages/auth/` - Authentication package
- `packages/shared/` - Shared utilities
- `packages/email/` - Email templates and sending
- `packages/stripe/` - Stripe integration
- `tooling/` - Shared tooling configs (ESLint, Prettier, TypeScript)

## Code Style

### TypeScript

- Use TypeScript strictly - avoid `any` types
- Prefer explicit types over inference when it improves clarity
- Use `as const` for literal types when appropriate
- Follow existing patterns for type definitions

### Naming Conventions

- **Files**: kebab-case for files (e.g., `card-repo.ts`)
- **Components**: PascalCase for React components
- **Functions**: camelCase for functions
- **Constants**: UPPER_SNAKE_CASE for constants
- **Types/Interfaces**: PascalCase

### Database Layer (`packages/db/`)

- **Schema**: Define schemas in `src/schema/` using Drizzle ORM
- **Migrations**: Create migrations with `cd packages/db && npx pnpm drizzle-kit generate --name "MigrationName"`, then run with `npx pnpm db:migrate`
- **Repositories**: Put database queries in `src/repository/` files
- **Soft Deletes**: Use `deletedAt` timestamp for soft deletion (not hard deletes)
- **Index Management**: Cards have `index` fields that must be maintained sequentially per list
- **Activity Logging**: Use `card_activity` table to track all card changes

### API Layer (`packages/api/`)

- **Routers**: Create tRPC routers in `src/routers/`
- **Procedures**: Use `protectedProcedure` for authenticated endpoints, `publicProcedure` for public
- **Validation**: Use Zod schemas for input validation
- **Error Handling**: Use `TRPCError` with appropriate error codes
- **OpenAPI**: Add OpenAPI metadata for all endpoints
- **Authorization**: Always check workspace membership with `assertUserInWorkspace`

### Frontend (`apps/web/`)

- **Components**: React components in `src/components/`
- **Views**: Page-level components in `src/views/`
- **Hooks**: Custom hooks in `src/hooks/`
- **i18n**: Use `t` template literal for translations (Lingui)
- **Styling**: Use Tailwind CSS classes
- **State Management**: Use tRPC React Query hooks for server state
- **Modals**: Use `useModal` hook for modal management
- **Popups**: Use `usePopup` hook for toast notifications
- **Drag & Drop**: Uses `react-beautiful-dnd` (`DragDropContext`, `Droppable`, `Draggable`). Wrapped in `StrictModeDroppable` (`~/components/StrictModeDroppable`) to fix React 18 strict mode issues
- **Permissions**: `usePermissions()` hook returns `canCreateList`, `canEditList`, `canEditCard`, `canEditBoard`
- **Dropdowns**: `CheckboxDropdown` (`~/components/CheckboxDropdown`) accepts either flat `items` array or nested `groups` array with sub-items. Used for toolbar buttons, visibility toggles, filter menus, etc.
- **Buttons**: `Button` component (`~/components/Button`) supports variants: `primary`, `secondary`, `danger`, `ghost`. Use `secondary` for toolbar buttons

## Key Concepts

### Cards

- Cards are the main entity in Kan
- Cards belong to Lists, which belong to Boards
- Cards have: title, description, labels, members, checklists, comments, attachments, due dates
- Cards use soft deletion (`deletedAt` field)
- Cards have an `index` field that must be maintained sequentially per list
- All card changes are tracked in `card_activity` table

### Labels (Tags)

- Labels are defined per board in the `labels` table (schema: `packages/db/src/schema/labels.ts`)
- Cards-to-labels is a many-to-many relationship via `cardsToLabels` junction table (`_card_labels` in DB)
- In the API response, labels are **flattened** — each card has `labels: { publicId, name, colourCode }[]` (the join is resolved server-side in `board.repo.ts`)
- Labels are rendered on cards as `<Badge>` components with `<LabelIcon>` showing the colour

### Activity Tracking

- Every significant card change creates an activity record
- Activity types include: created, updated (various fields), etc.
- Activities are displayed in card activity feeds

### Workspaces & Boards

- Users belong to Workspaces
- Boards belong to Workspaces
- Workspace members have different permission levels
- Boards can be public or private

### Soft Deletion Pattern

- Entities use `deletedAt` timestamp for soft deletion
- Queries filter with `isNull(table.deletedAt)` to exclude deleted items

## File Locations Reference

### Database

- Schema: `packages/db/src/schema/*.ts`
- Repositories: `packages/db/src/repository/*.repo.ts`
- Migrations: `packages/db/migrations/`

### API

- Routers: `packages/api/src/routers/*.ts`
- Utils: `packages/api/src/utils/`
- Types: `packages/api/src/types/`

### Frontend

- Components: `apps/web/src/components/`
- Views: `apps/web/src/views/`
- Pages: `apps/web/src/pages/`
- Hooks: `apps/web/src/hooks/`
- Utils: `apps/web/src/utils/`
- Locales: `apps/web/src/locales/`

### Docker

- Production compose: `docker-compose.yml`
- Development compose: `docker-compose.dev.yml` (hot-reloading enabled)
- Web Dockerfile: `apps/web/Dockerfile`

## Database Patterns

- **Soft Deletes**: Always filter with `isNull(table.deletedAt)` in queries
- **Public IDs**: Use 12-character public IDs (`publicId`) for all user-facing entities
- **Internal IDs**: Never expose internal database IDs (e.g., `id`, `cardId`, `listId`) in API responses or URLs - always use `publicId` externally
- **Transactions**: Use database transactions for multi-step operations
- **Index Management**: When deleting/moving cards, maintain sequential indices
- **Activity Tracking**: Create activity records for all significant changes

## API Patterns

- **Input Validation**: Always validate inputs with Zod
- **Error Messages**: Provide clear, user-friendly error messages
- **Optimistic Updates**: Use tRPC's `onMutate` for optimistic UI updates
- **Cache Invalidation**: Properly invalidate queries after mutations
- **ID Exposure**: Never expose internal database IDs (`id`, `cardId`, `listId`, etc.) in API responses, URLs, or frontend code - always use `publicId` for external communication

## Important Patterns

### Card Index Management

When cards are created, moved, or deleted, their indices must be maintained:

- New cards: Append to end (max index + 1) or insert at position
- Moving cards: Adjust indices of affected cards
- Deleting cards: Decrement indices of cards after deleted one
- Always use transactions for index updates

### Activity Logging

Create activity records for:

- Card creation
- Card updates (title, description, list, etc.)
- Label/member additions/removals
- Comments
- Checklists and items
- Attachments
- Due dates

### Authorization

Always check:

1. User is authenticated
2. User has access to workspace
3. User has permission for the operation

Use `assertUserInWorkspace` helper for workspace checks.

### Error Handling

- Use TRPCError with appropriate codes (UNAUTHORIZED, NOT_FOUND, etc.)
- Provide user-friendly error messages
- Log errors appropriately using the `@kan/logger` package
- Show popup notifications for user-facing errors

### Logging

- Import from `@kan/logger`: `import { createLogger } from "@kan/logger"`
- Create a module-scoped logger: `const logger = createLogger("module-name")`
- Log level is controlled by `LOG_LEVEL` env var (debug, info, warn, error)
- Defaults to `debug` in development, `info` in production
- Never use `console.log` — always use the logger

## Common Patterns

### Creating a Card

1. Create card in repository with proper index management
2. Create `card.created` activity
3. Handle label/member relationships if provided
4. Return the created card

### Updating a Card

1. Validate user has workspace access
2. Update card fields
3. Create appropriate activity records
4. Invalidate relevant queries

### Querying Cards

- Always filter by `isNull(cards.deletedAt)` in queries
- Include related data (labels, members, checklists) via Drizzle relations
- Order by `index` for proper card ordering

## Adding a New Feature

1. **Database**: Update schema in `packages/db/src/schema/`
2. **Migration**: Create migration with `cd packages/db && npx pnpm drizzle-kit generate --name "MigrationName"`, then run with `npx pnpm db:migrate`
3. **Repository**: Add repository functions in `packages/db/src/repository/`
4. **API**: Add tRPC router procedures in `packages/api/src/routers/`
5. **Frontend**: Add UI components in `apps/web/src/`
6. **i18n**: Add translations for new strings

## Adding a New Environment Variable

Update all of the following:

1. `.env.example` — add the variable with an empty value and a comment explaining it
2. `turbo.json` — add to `globalEnv` (or `globalPassThroughEnv` for CI/platform vars)
3. `docker-compose.yml` — add to the `web` service `environment` section
4. `docker-compose.dev.yml` — add to the `web` service `environment` section
5. `cloud/docker-compose.yml` — add to the `web` service `environment` section
6. `README.md` — add a row to the Environment Variables table

## Database Changes

- Always create migrations (never modify existing migrations)
- Create migrations with: `cd packages/db && npx pnpm drizzle-kit generate --name "MigrationName"`
- Run migrations with: `npx pnpm db:migrate`
- Update schema files in `packages/db/src/schema/`
- Test migrations on development database first
- Update TypeScript types after schema changes
- Consider index management for card operations

## API Endpoints

- Use tRPC procedures (not REST)
- Add OpenAPI metadata for documentation
- Validate inputs with Zod
- Check workspace permissions
- Create activity records for significant changes

## Frontend Components

- Use Tailwind for styling
- Follow existing component patterns
- Use tRPC hooks for data fetching
- Implement optimistic updates where appropriate
- Add proper loading and error states

## Testing Instructions

- Test database operations in transactions that rollback
- Test authorization checks
- Test index management when moving/deleting cards
- Test activity logging
- Test UI interactions
- Run `npx pnpm lint` and `npx pnpm typecheck` before committing

### Pre-existing Build Errors

Many packages have pre-existing lint and typecheck errors (e.g., `@kan/api`, `@kan/auth`, `@kan/db`, `@kan/email`, `@kan/web`). When running `npx pnpm lint` or `npx pnpm typecheck`, failures in packages you didn't modify are expected and not caused by your changes. Focus on verifying your specific files compile correctly.

## Performance Considerations

- Use database indexes appropriately
- Batch operations when possible
- Avoid N+1 queries
- Use transactions for related operations
- Implement optimistic updates in UI

## Security

- Always check workspace membership before operations
- Validate all inputs
- Never expose internal database IDs (`id`, `cardId`, `listId`, etc.) in API responses, URLs, or frontend code - always use `publicId` externally
- Sanitize user input

## Internationalization

- **Skip all translation/i18n tasks.** Do not update locale files, extract strings with Lingui, or modify any translation catalogs. Leave i18n work for humans to handle separately.

## Dependencies

- Use workspace dependencies (`workspace:*`) for internal packages
- Keep dependencies up to date
- Use catalog for shared dependency versions

## When Implementing Features

### Adding New Card Fields

1. Update schema in `packages/db/src/schema/cards.ts`
2. Create migration
3. Update repository functions
4. Add API endpoints
5. Update frontend components
6. Add activity tracking if needed

### Adding New Activity Types

1. Add to `activityTypes` array in schema
2. Create migration to update enum
3. Use in activity creation code
4. Update activity display components if needed

## Board Toolbar

The board toolbar is in `apps/web/src/views/board/index.tsx` (~line 628). Toolbar buttons from left to right:

| Component | File |
|-----------|------|
| Template badge | inline |
| UpdateBoardSlugButton | `views/board/components/UpdateBoardSlugButton.tsx` |
| VisibilityButton | `views/board/components/VisibilityButton.tsx` |
| Filters | `views/board/components/Filters.tsx` |
| GroupButton | `views/board/components/GroupButton.tsx` |
| "New list" Button | inline |
| BoardDropdown | `views/board/components/BoardDropdown.tsx` |

### URL Query Param Pattern for UI State

Filter and grouping state is stored in URL query params (`?members=...&labels=...&group=tag`). This uses `next/router`'s `router.query` and `router.push()` to read/write state. Benefits: state survives page refreshes and is shareable via URL.

### Client-Side Card Reordering

When implementing visual-only card reordering (e.g., grouping), use `getGroupedCards()` to sort cards by label before rendering. **Important**: card drag-and-drop must be disabled (`isDragDisabled={true}`) when the visual order differs from the DB `index` order, because the optimistic update logic relies on matching array position to DB index.

## Git & Commits

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
- Keep commits focused on single changes
- Reference issue numbers when applicable

## PR Instructions

- Title format: `feat: description` or `fix: description`
- Always run `npx pnpm lint` and `npx pnpm typecheck` before committing
- Provide clear description of changes
- Include screenshots for UI changes
- Keep PRs focused on a single feature/fix
