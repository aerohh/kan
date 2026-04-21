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

## Security

- Always check workspace membership before operations
- Validate all inputs
- Never expose internal database IDs (`id`, `cardId`, `listId`, etc.) in API responses, URLs, or frontend code — always use `publicId` externally
- Sanitize user input
