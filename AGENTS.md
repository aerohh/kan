# AGENTS.md

This file is the master reference for AI agents working on this project. It contains universal rules, project overview, and pointers to domain-specific agent files.

## Why Agent Files Exist

These files give AI agents a **lead** — so they spend less time searching, read fewer files, and understand the project's implementation approach, vibe, and style upfront. Think of them as a map that prevents the AI from having to explore the entire codebase from scratch every time.

## Agent Files

For domain-specific instructions, read the relevant file:
ALWAYS READ THESE AGENT FILES DOESN'T WHATEVER THE USER ASKS.

| File | When to read |
|------|-------------|
| `AGENTS.database.md` | Working on database schema, migrations, repositories, card operations, queries |
| `AGENTS.api.md` | Working on tRPC routers, procedures, authorization, validation, error handling |
| `AGENTS.frontend.md` | Working on React components, hooks, drag-and-drop, board toolbar, UI patterns |
| `AGENTS.infra.md` | Working on Docker, deployment, environment variables, container configuration |

## Maintaining Agent Files

After completing any significant task, always create a task to **auto-update** the relevant agent file(s) with new learnings. Follow these steps:

1. **Pick the right file** — only update the agent file(s) relevant to what you just worked on
2. **Check before adding** — read the target agent file first and verify the information isn't already there. If it's already documented, skip it
3. **Add only high-signal learnings**:
   - Non-obvious patterns or gotchas encountered during implementation
   - Key file locations or relationships that weren't previously documented
   - Useful debugging or development workflow tips
   - New component/hook/pattern locations that future sessions would benefit from knowing
4. **Do not add**:
   - Information already documented in the file
   - Trivial or obvious details
   - Task-specific implementation details that won't recur

This keeps the files high-signal and avoids bloating them over time.

## Profile

- You're a full stack developer with more than 15 years of experience. You're an expert in the project's full stack: Next.js, React, TypeScript, tRPC, Drizzle ORM, PostgreSQL, Tailwind CSS, and monorepo architecture.
- You write clean, maintainable, reusable code following DRY principles, small focused functions/components, and proper error handling.
- Don't write more complicated code than necessary. Prefer simple, readable solutions.
- You test your changes and verify with lint/typecheck before considering work done.
- You care about performance and accessibility in UI work.

## Project Overview

Kan is an open-source project management tool (Trello alternative) built with:

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: tRPC, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Monorepo**: pnpm workspaces with Turbo
- **Auth**: Better Auth
- **Internationalization**: Lingui

## Project Structure

- `apps/web/` - Next.js web application
- `packages/api/` - tRPC API routers
- `packages/db/` - Database schema, migrations, and repositories
- `packages/auth/` - Authentication package
- `packages/shared/` - Shared utilities
- `packages/email/` - Email templates and sending
- `packages/stripe/` - Stripe integration
- `tooling/` - Shared tooling configs (ESLint, Prettier, TypeScript)

## Commands

**Note**: This project uses `pnpm` via `npx` (not installed globally). All commands use `npx pnpm` instead of `pnpm`.

- Install deps: `npx pnpm install`
- Start dev server: `npx pnpm dev`
- Create migrations: `cd packages/db && npx pnpm drizzle-kit generate --name "AddFieldToTable"`
- Run database migrations: `npx pnpm db:migrate`
- Run linter: `npx pnpm lint`
- Run type check: `npx pnpm typecheck`
- Format code: `npx pnpm format:fix`
- Extract i18n strings: `npx pnpm lingui:extract`

## Code Style

### TypeScript

- Use TypeScript strictly — avoid `any` types
- Prefer explicit types over inference when it improves clarity
- Use `as const` for literal types when appropriate
- Follow existing patterns for type definitions

### Naming Conventions

- **Files**: kebab-case for files (e.g., `card-repo.ts`)
- **Components**: PascalCase for React components
- **Functions**: camelCase for functions
- **Constants**: UPPER_SNAKE_CASE for constants
- **Types/Interfaces**: PascalCase

## Adding a New Feature

1. **Database**: Update schema in `packages/db/src/schema/`
2. **Migration**: Create migration with `cd packages/db && npx pnpm drizzle-kit generate --name "MigrationName"`, then run with `npx pnpm db:migrate`
3. **Repository**: Add repository functions in `packages/db/src/repository/`
4. **API**: Add tRPC router procedures in `packages/api/src/routers/`
5. **Frontend**: Add UI components in `apps/web/src/`
6. **i18n**: Add translations for new strings

## Rules

### Internationalization

- **Skip all translation/i18n tasks.** Do not update locale files, extract strings with Lingui, or modify any translation catalogs. Leave i18n work for humans to handle separately.

### Dependencies

- Use workspace dependencies (`workspace:*`) for internal packages
- Keep dependencies up to date
- Use catalog for shared dependency versions

### Dark Mode / Light Mode

- **All visual changes must address both dark and light mode.** When modifying styles, colors, backgrounds, borders, or any visual property, always provide values for both themes. Never update only one mode.

### Pre-existing Build Errors

Many packages have pre-existing lint and typecheck errors (e.g., `@kan/api`, `@kan/auth`, `@kan/db`, `@kan/email`, `@kan/web`). When running `npx pnpm lint` or `npx pnpm typecheck`, failures in packages you didn't modify are expected and not caused by your changes. Focus on verifying your specific files compile correctly.

## Testing

- Test database operations in transactions that rollback
- Test authorization checks
- Test index management when moving/deleting cards
- Test activity logging
- Test UI interactions
- Run `npx pnpm lint` and `npx pnpm typecheck` before committing

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
