# AGENTS.database.md

Instructions for working with the database layer (`packages/db/`).

## File Locations

- Schema: `packages/db/src/schema/*.ts`
- Repositories: `packages/db/src/repository/*.repo.ts`
- Migrations: `packages/db/migrations/`

## Schema Conventions

- Define schemas in `src/schema/` using Drizzle ORM
- Use `publicId` (12-character) for all user-facing entities
- Never expose internal database IDs (`id`, `cardId`, `listId`) in API responses or URLs — always use `publicId` externally

## Migrations

- Always create migrations (never modify existing migrations)
- Create migrations with: `cd packages/db && npx pnpm drizzle-kit generate --name "MigrationName"`
- Run migrations with: `npx pnpm db:migrate`
- Test migrations on development database first
- Update TypeScript types after schema changes

## Repositories

- Put database queries in `src/repository/` files (e.g., `card-repo.ts`)

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

### Card ↔ Docs Relationship

- Cards and docs are linked through `_card_docs` (`cardsToDocs` in Drizzle) with a composite primary key (`cardId`, `docId`) and cascade deletes on both foreign keys
- Junction helper functions live in `packages/db/src/repository/card.repo.ts`: `getCardDocRelationship`, `createCardDocRelationship`, `hardDeleteCardDocRelationship`
- Card and board repo responses flatten docs from the junction:
  - Board/list card payloads include `docs: { publicId }[]`
  - Card detail payloads include `docs: { publicId, title }[]`

### Doc ↔ Labels Relationship

- Docs and labels are linked through `_doc_labels` (`docsToLabels` in Drizzle) with a composite primary key (`docId`, `labelId`) and cascade deletes on both foreign keys
- Schema defined in `packages/db/src/schema/docs.ts` alongside `docs` table and `docsToLabels` relations
- Labels relation added to `docsRelations` (`labels: many(docsToLabels)`) and `labelsRelations` (`docs: many(docsToLabels)`)
- Note: circular import between `docs.ts` and `labels.ts` (same pattern as `cards.ts` ↔ `labels.ts`)
- Repo functions in `packages/db/src/repository/doc.repo.ts`:
  - `getDocLabelIds(db, docId)` — returns current label internal IDs for a doc
  - `syncDocLabels(db, { docId, labelIds })` — diff-based sync (inserts missing, removes extras)
- `label.repo.ts` has `getAllByWorkspaceId(db, workspaceId)` — fetches all non-deleted labels across all boards in a workspace (joins `labels` → `boards`, filters by `boards.workspaceId`)

### Activity Tracking

- Every significant card change creates an activity record
- Activity types include: created, updated (various fields), etc.
- Activities are displayed in card activity feeds

### Soft Deletion Pattern

- Entities use `deletedAt` timestamp for soft deletion (not hard deletes)
- Queries filter with `isNull(table.deletedAt)` to exclude deleted items

## Database Patterns

- **Soft Deletes**: Always filter with `isNull(table.deletedAt)` in queries
- **Public IDs**: Use 12-character public IDs (`publicId`) for all user-facing entities
- **Internal IDs**: Never expose internal database IDs (e.g., `id`, `cardId`, `listId`) in API responses or URLs — always use `publicId` externally
- **Transactions**: Use database transactions for multi-step operations
- **Index Management**: When deleting/moving cards, maintain sequential indices
- **Activity Tracking**: Create activity records for all significant changes

## Card Index Management

When cards are created, moved, or deleted, their indices must be maintained:

- New cards: Append to end (max index + 1) or insert at position
- Moving cards: Adjust indices of affected cards
- Deleting cards: Decrement indices of cards after deleted one
- Always use transactions for index updates

## Activity Logging

Create activity records for:

- Card creation
- Card updates (title, description, list, etc.)
- Label/member additions/removals
- Comments
- Checklists and items
- Attachments
- Due dates

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

## Adding New Card Fields

1. Update schema in `packages/db/src/schema/cards.ts`
2. Create migration
3. Update repository functions
4. Add API endpoints
5. Update frontend components
6. Add activity tracking if needed

## Adding New Activity Types

1. Add to `activityTypes` array in schema
2. Create migration to update enum
3. Use in activity creation code
4. Update activity display components if needed

Current card-doc activity types:
- `card.updated.doc.attached`
- `card.updated.doc.detached`

## Docs feature

- Docs are workspace-scoped documents with title + BlockNote JSON content
- Schema: `packages/db/src/schema/docs.ts` (table name `doc`)
- Repository: `packages/db/src/repository/doc.repo.ts`
- Uses `jsonb` for `content` column (stores BlockNote block arrays)
- Soft deletion via `deletedAt`/`deletedBy` fields (same pattern as cards)
- Follows same conventions: `publicId` (12-char), RLS enabled, indexes on `workspaceId`/`createdBy`/`deletedAt`

### Card Description Storage

- Card `description` column is `jsonb` (not `text`). It stores BlockNote block arrays (`unknown[] | null`) instead of HTML strings
- The type in repos/schemas is `string | unknown[] | null` to support legacy HTML strings during transition, but new saves always write JSON blocks
- Migration `20260423234129_ChangeCardDescriptionToJsonb` converts existing text to jsonb using `to_jsonb(description)`

## Performance

- Use database indexes appropriately
- Batch operations when possible
- Avoid N+1 queries
- Use transactions for related operations

## Migration Gotchas

- When the dev database was set up via `drizzle-kit push` (no `__drizzle_migrations` table), running `drizzle-kit migrate` will try to apply ALL migrations from scratch against an existing schema — this can fail on `ALTER TYPE ADD VALUE` if enum labels already exist
- Fix: wrap `ALTER TYPE ... ADD VALUE` in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` blocks
- `ALTER TABLE ... SET DATA TYPE` also needs error handling (`EXCEPTION WHEN cannot_coerce THEN null`)
- Always verify the generated migration SQL only contains the intended changes — if previous migrations weren't applied, `drizzle-kit generate` may capture their changes too
- Be cautious running `docker compose -f docker-compose.dev.yml` commands when the production `docker-compose.yml` is also in use — both share the project name "kan" and Docker may recreate production containers
