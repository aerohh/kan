# AGENTS.api.md

Instructions for working with the API layer (`packages/api/`).

## File Locations

- Routers: `packages/api/src/routers/*.ts`
- Utils: `packages/api/src/utils/`
- Types: `packages/api/src/types/`

## Router Conventions

- Create tRPC routers in `src/routers/`
- Use `protectedProcedure` for authenticated endpoints, `publicProcedure` for public
- Add OpenAPI metadata for all endpoints
- Use tRPC procedures (not REST)

## Validation

- Always validate inputs with Zod schemas

## Authorization

Always check in this order:

1. User is authenticated
2. User has access to workspace
3. User has permission for the operation

Use `assertUserInWorkspace` helper for workspace checks.

## Error Handling

- Use `TRPCError` with appropriate codes (UNAUTHORIZED, NOT_FOUND, etc.)
- Provide clear, user-friendly error messages
- Log errors appropriately using the `@kan/logger` package
- Show popup notifications for user-facing errors

## Logging

- Import from `@kan/logger`: `import { createLogger } from "@kan/logger"`
- Create a module-scoped logger: `const logger = createLogger("module-name")`
- Log level is controlled by `LOG_LEVEL` env var (debug, info, warn, error)
- Defaults to `debug` in development, `info` in production
- Never use `console.log` — always use the logger

## API Patterns

- **Input Validation**: Always validate inputs with Zod
- **Error Messages**: Provide clear, user-friendly error messages
- **Optimistic Updates**: Use tRPC's `onMutate` for optimistic UI updates
- **Cache Invalidation**: Properly invalidate queries after mutations
- **ID Exposure**: Never expose internal database IDs (`id`, `cardId`, `listId`, etc.) in API responses, URLs, or frontend code — always use `publicId` for external communication
- **Activity Records**: Create activity records for significant changes
- **Workspace Permissions**: Always check workspace permissions before operations

## Docs feature Router

- Router: `packages/api/src/routers/doc.ts`
- Schemas: `packages/api/src/schemas/doc.ts`
- CRUD endpoints: `create`, `update`, `byId`, `list`, `delete` (soft delete), `syncLabels`
- All endpoints follow the standard pattern: auth check → workspace lookup → `assertUserInWorkspace` → repo call
- Registered as `doc: docRouter` in `root.ts`

### Doc Labels Sync

- `doc.syncLabels` is a tRPC mutation (no OpenAPI metadata — internal use only)
- Input: `{ docPublicId: string, labelPublicIds: string[] }`
- Auth flow: resolve doc → get workspaceId → `assertUserInWorkspace` → resolve label public IDs to internal IDs → call `docRepo.syncDocLabels`
- Called from `DocEditorInner` on every doc save to keep `_doc_labels` junction table in sync with `#label` inline content

### Label List by Workspace

- `label.listByWorkspace` in `packages/api/src/routers/label.ts`
- Input: `{ workspacePublicId: string }`, output: `z.array(z.object({ publicId, name, colourCode }))`
- Returns all non-deleted labels across all boards in a workspace (for the `#` label picker in doc editor)
- Auth: standard workspace membership check via `assertUserInWorkspace`

### Card Description as JSON Blocks

- Card `description` fields in Zod schemas use `z.union([z.string(), z.array(z.unknown())])` to accept both legacy HTML strings and new JSON block arrays
- The `card.update` procedure uses `input.description !== undefined` (not truthy check) since `[]` is falsy but valid
- Description change detection uses `JSON.stringify()` comparison since the content is now structured data

### Mention Parsing

- `sendMentionEmails` (in `utils/notifications.ts`) accepts `descriptionContent: string | unknown[]` instead of `commentHtml: string`
- Uses `parseMentionsFromContent` from `@kan/shared/utils` which handles both HTML strings (regex) and JSON block arrays (tree walk looking for `type: "mention"` nodes with `props.id`)

### Card Docs Attachment API

- `card.addOrRemoveDoc` in `packages/api/src/routers/card.ts` is a toggle endpoint (attach if missing, detach if existing)
- Input: `{ cardPublicId, docPublicId }` (both min length 12), output: `{ attached: boolean }`
- Authorization flow: authenticate user → resolve card + workspace by `cardPublicId` → `assertPermission(..., "card:edit")` → resolve doc by `docPublicId`
- This mutation creates activity records:
  - attach: `card.updated.doc.attached` with `toTitle`
  - detach: `card.updated.doc.detached` with `toTitle`
- Keep schema alignment with repo responses:
  - `cardDetailSchema.docs`: `{ publicId, title }[]`
  - board card schemas (`byId`/`bySlug`) include `docs: { publicId }[]`

### Default Property Group on Board Creation

- When a new board is created via `board.create` (standard path, not snapshot/clone or import), a default "Status" property group (single-select) is automatically created with three options: "Todo" (Charcoal `#3f3f46`), "In Progress" (Amber `#d97706`), "Done" (Sage `#4d7c5c`)
- This happens in `packages/api/src/routers/board.ts` after lists and labels are set up, using `propertyGroupRepo.create` + `propertyOptionRepo.create` in a loop
- No default lists are created — boards start with no lists. Lists are created lazily on the frontend when the first card is added (via `ensureListAndAddCard` in `board/index.tsx`)
- The snapshot/clone path (`createFromSnapshot`) and import paths do NOT create default groups — they copy structure from the source

### Property Group & Option Routers

- `propertyGroup` router (`packages/api/src/routers/property-group.ts`): `list`, `create`, `update`, `delete`, `reorder`
- `update` accepts optional `showOnCard` boolean to toggle visibility on cards
- `propertyOption` router (`packages/api/src/routers/property-option.ts`): `create`, `update`, `delete`
- All endpoints follow standard auth pattern: resolve board → check workspace permission → repo call
- Registered as `propertyGroup` and `propertyOption` in `root.ts`

### Card Property Toggle API

- `card.addOrRemoveProperty` in `packages/api/src/routers/card.ts` is a toggle endpoint
- Input: `{ cardPublicId, optionPublicId }`, output: `{ added: boolean }`
- For single-select groups: removes previous option from same group before adding new one. Logs `card.updated.property.removed` activity for the displaced option (with `toTitle` = old option name).
- Activity types: `card.updated.property.added` / `card.updated.property.removed` with `toTitle` = option name
- `getByPublicId` filters by `isNull(deletedAt)` — soft-deleted options cannot be re-attached

### Property Zod Schemas

- `propertyOptionSchema` and `propertyGroupSchema` are defined **locally** in both `schemas/board.ts` and `schemas/card.ts` (not shared from `common.ts`) because the shape differs slightly between contexts:
- `propertyGroupSchema` includes `showOnCard: z.boolean()` field
  - Board card schemas: `propertyOptionSchema` has `groupId: z.number()` (needed for frontend grouping)
  - Property group schema: `type: z.string()` (not a literal union — matches DB's text column, avoids schema migration coupling)
- `propertyGroupSchema` has nested `options` array with `index: z.number()` for ordering
- `boardDetailSchema` and `boardBySlugSchema` both include `propertyGroups: z.array(propertyGroupSchema)` at board level
- Card sub-schemas (`boardDetailCardSchema`, `boardSlugCardSchema`, `cardDetailSchema`) include `properties: z.array(propertyOptionSchema)` at card level

## Security

- Always check workspace membership before operations
- Validate all inputs
- Never expose internal database IDs (`id`, `cardId`, `listId`, etc.) in API responses, URLs, or frontend code — always use `publicId` externally
- Sanitize user input
