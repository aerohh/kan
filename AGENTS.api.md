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

## Security

- Always check workspace membership before operations
- Validate all inputs
- Never expose internal database IDs (`id`, `cardId`, `listId`, etc.) in API responses, URLs, or frontend code — always use `publicId` externally
- Sanitize user input
