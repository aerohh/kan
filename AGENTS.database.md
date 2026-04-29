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

## Property Groups & Options (Dynamic Property System)

### Overview

The property system replaces the flat label system with a hierarchical Group → Option structure. This enables dynamic, user-defined properties on cards (similar to Notion's database properties).

### Tables

- **`property_group`** (`packages/db/src/schema/property-groups.ts`): Named categories with a type (`single-select` | `multi-select`). Board-scoped. Has `index` for ordering.
- **`property_option`** (`packages/db/src/schema/property-options.ts`): Selectable values within a group. Has `name`, `colourCode`, `index`, `groupId` FK, and denormalized `boardId`.
- **`_card_properties`** (`packages/db/src/schema/cards.ts`): Junction table (cardId, optionId) with cascade deletes.

### Repositories

- `packages/db/src/repository/property-group.repo.ts`: CRUD, reorder, getAllByBoardId (with nested options)
- `packages/db/src/repository/property-option.repo.ts`: CRUD, soft delete (cascades to card links), card junction management (createCardPropertyRelation, hardDeleteCardPropertyRelation, syncCardProperties, getCardOptionIds)

### Repo Gotchas

- **`property-option.repo.ts` `create`**: Auto-computes next `index` within the group (`max(index) + 1`). Wrapped in a transaction because it optionally also creates a card-property junction row.
- **`property-option.repo.ts` `softDelete`**: Wrapped in a transaction — soft-deletes the option and hard-deletes all card-property junction rows atomically.
- **`property-option.repo.ts` `syncCardProperties`**: Wrapped in a transaction — inlines the `getCardOptionIds` query rather than calling the standalone function (avoids `tx as dbClient` type cast).
- **`getByPublicId`** in `property-option.repo.ts`: Filters `isNull(deletedAt)` — prevents re-attaching soft-deleted options to cards.
- **Transaction type incompatibility**: `db.transaction(async (tx) => { ... })` yields a `PgTransaction` type that is NOT assignable to `dbClient`. Repo functions that accept `dbClient` cannot receive `tx` directly. When a transaction is needed, keep it inside the repo function (not in the API layer).

### Key Design Decisions

- Board-global `index` on cards (not per-list) — card indices are sequential within the entire board, not per-list
- No `defaultGroupId` on boards table — first group (lowest index) is the default column organizer (bidirectional FK between boards↔propertyGroups caused TypeScript circular type inference)
- Single-select enforcement is application-level only (API removes previous option before adding new one)
- Properties are returned alongside labels during transition period (both old and new data in API responses)

### How Properties Are Returned in Repo Responses

Properties follow the same flattening pattern as labels:

- **Board repo** (`board.repo.ts`): Queries `_card_properties` with `with: { option: { columns: { publicId, name, colourCode, groupId } } }`, then flattens: `card.properties.map((p) => p.option)`. Result: `{ publicId, name, colourCode, groupId }[]` per card.
- **Card repo** (`card.repo.ts`): Same pattern in `byPublicId()` — flattens `card.properties.map((p) => p.option)`.
- **Board repo** also returns `propertyGroups` with nested `options` via Drizzle relations (separate from card-level properties):
  ```
  propertyGroups: { with: { options: { where: isNull(deletedAt), orderBy: asc(index) } }, where: isNull(deletedAt), orderBy: [asc(index)] }
  ```
- Both `byId` and `bySlug` board queries return `propertyGroups` at the board level.
- Card detail query (`card.repo.ts byPublicId`) also returns `board.propertyGroups` with nested options.

### Activity Types

- `card.updated.property.added` — logged when a property option is attached to a card
- `card.updated.property.removed` — logged when a property option is detached from a card

### Migration: Lists → Status group, Labels → Tags group

- Migration `20260428213000_MigrateListsAndLabelsToProperties.sql` converts existing data:
  - Creates "Status" group (single-select) per board from lists
  - Creates "Tags" group (multi-select) per board from labels
  - Creates property options matching list/label names
  - Links cards to their list's option and label options via `_card_properties`
  - Renumbers card indices to be board-global (ordered by list index, then card index)

### Drizzle Relations for Properties

- `cardsRelations` in `cards.ts` includes `properties: many(cardsToProperties)`
- `cardsToProperties` relations map to `option: one(propertyOptions)` for the join
- `propertyGroupsRelations` in `property-groups.ts` includes `options: many(propertyOptions)`
- `boardsRelations` in `boards.ts` includes `propertyGroups: many(propertyGroups)` (separate from card-level)
- Circular import: `cards.ts` ↔ `property-options.ts` (same pattern as `cards.ts` ↔ `labels.ts`)

### showOnCard: Property Group Visibility on Cards

- `property_group` table has a `showOnCard` boolean column (default: `true`)
- Controls which property groups display as badges on cards in the board view
- New groups default to visible (`showOnCard: true`), toggled via star icon in PropertyGroupManager
- Repository queries fetch `showOnCard` via nested joins in `board.repo.ts`:
  - Board-level queries include `id` and `showOnCard` in `propertyGroups` columns
  - Card-level property queries include nested `group` relation to access `showOnCard`:
    ```ts
    properties: {
      with: {
        option: {
          columns: { publicId, name, colourCode, groupId },
          with: { group: { columns: { showOnCard: true } } }
        }
      }
    }
    ```
- **Client-side filtering**: Both the main board view (`apps/web/src/views/board/index.tsx`) and the public board view (`apps/web/src/views/public/board/index.tsx`) build a `starredGroupIds` Set from groups with `showOnCard: true`, then filter card properties by `groupId` membership before rendering
- PropertyGroupManager UI shows star toggle: filled amber = visible, outline = hidden
