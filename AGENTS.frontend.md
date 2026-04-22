# AGENTS.frontend.md

Instructions for working with the frontend (`apps/web/`).

## File Locations

- Components: `apps/web/src/components/`
- Views: `apps/web/src/views/`
- Pages: `apps/web/src/pages/`
- Hooks: `apps/web/src/hooks/`
- Utils: `apps/web/src/utils/`
- Locales: `apps/web/src/locales/`

## Component Conventions

- React components in `src/components/`
- Page-level components in `src/views/`
- Custom hooks in `src/hooks/`
- Use Tailwind CSS classes for styling
- Follow existing component patterns
- Add proper loading and error states
- Implement optimistic updates where appropriate

## State & Data

- Use tRPC React Query hooks for server state
- Use `useModal` hook for modal management
- Use `usePopup` hook for toast notifications
- Use `usePermissions()` hook — returns `canCreateList`, `canEditList`, `canEditCard`, `canEditBoard`

## UI Components

- **Buttons**: `Button` component (`~/components/Button`) supports variants: `primary`, `secondary`, `danger`, `ghost`. Use `secondary` for toolbar buttons
- **Dropdowns**: `CheckboxDropdown` (`~/components/CheckboxDropdown`) accepts either flat `items` array or nested `groups` array with sub-items. Used for toolbar buttons, visibility toggles, filter menus, etc.
- **i18n**: Use `t` template literal for translations (Lingui)

## Drag & Drop

- Uses `react-beautiful-dnd` (`DragDropContext`, `Droppable`, `Draggable`)
- Wrapped in `StrictModeDroppable` (`~/components/StrictModeDroppable`) to fix React 18 strict mode issues

## Key Concepts

### Workspaces & Boards

- Users belong to Workspaces
- Boards belong to Workspaces
- Workspace members have different permission levels
- Boards can be public or private

## Board Toolbar

The board toolbar is in `apps/web/src/views/board/index.tsx` (~line 840). Toolbar buttons from left to right:

| Component | File |
|-----------|------|
| Template badge | inline |
| UpdateBoardSlugButton | `views/board/components/UpdateBoardSlugButton.tsx` |
| VisibilityButton | `views/board/components/VisibilityButton.tsx` |
| SortButton | `views/board/components/SortButton.tsx` |
| Filters | `views/board/components/Filters.tsx` |
| GroupButton | `views/board/components/GroupButton.tsx` |
| ViewSwitchButton | `views/board/components/ViewSwitchButton.tsx` |
| "New list" Button | inline |
| BoardDropdown | `views/board/components/BoardDropdown.tsx` |

### URL Query Param Pattern for UI State

Filter, grouping, and view state is stored in URL query params (`?members=...&labels=...&group=tag&sort=alphabet&view=sheet`). This uses `next/router`'s `router.query` and `router.push()` to read/write state. Benefits: state survives page refreshes and is shareable via URL.

### Board View Modes

The board supports two view modes, toggled via `ViewSwitchButton` in the toolbar:

- **Kanban** (default, no URL param): Horizontal scroll with `DragDropContext`, `List`, and `Card` components
- **Sheet** (`?view=sheet`): Table view via `SheetView` component (`views/board/components/SheetView.tsx`)

The `viewMode` variable (`(router.query.view as string) || "kanban"`) controls which renders. Key differences:
- Kanban uses `useDragToScroll` (horizontal) and `useScrollRestore`; sheet disables both
- Sheet flattens all cards from all lists into a single array with `listName`/`listPublicId` added to each card
- Sheet reuses `getSortedCards()` and `getGroupedCards()` for sorting/grouping on the flat array (requires type assertion since functions expect `CardData[]`)

#### Sheet View Inline Editing

Sheet cells use inline editors instead of navigating to card detail:
- **Labels, Members, List**: `CheckboxDropdown` wraps cell content as trigger. Calls `api.card.addOrRemoveLabel`, `api.card.addOrRemoveMember`, `api.card.update` respectively
- **Due Date**: `DateSelector` in an absolute-positioned popover with a `fixed` overlay for click-outside dismissal
- **Title**: Click navigates to card detail (only cell that navigates)
- **Progress**: Read-only (derived from checklists)

Mutations are defined directly in `SheetView` using tRPC hooks. After mutations settle, `utils.board.byId.invalidate()` refetches board data.

#### CheckboxDropdown Centering Gotcha

`CheckboxDropdown` renders its root `div` with `w-full`, which prevents centering via parent `flex justify-center` alone. To center it within a table cell, wrap it in a `div` with `w-auto` to override the full-width behavior, then use `flex justify-center` on an outer wrapper.

#### CheckboxDropdown Inline Usage

`CheckboxDropdown` accepts an optional `className` prop to override the default `relative flex w-full flex-wrap items-center text-left`. For inline/horizontal layouts (e.g., selectors in a row), pass `className="relative inline-flex items-center text-left"` to prevent full-width expansion. When `className` is provided, the `Menu.Button` also drops `h-full w-full` so the trigger sizes to its content.

### Card Detail Page Layout

The card detail page (`apps/web/src/views/card/index.tsx`) composes two main areas via the `Dashboard` component's `rightPanel` prop:

- **Main content** (`CardPage` default export): Title → inline selectors (List, Labels, Members, Due date) → Editor → Checklists → Attachments
- **Right sidebar** (`CardActivityPanel` named export): Activity log → Comments

Layout is wired in two places:
- Full page: `pages/cards/[cardId]/index.tsx` passes `<CardActivityPanel />` to `getDashboardLayout(page, rightPanel, true)`
- Slide-over: `components/CardSlideOver.tsx` renders `<CardPage>` and `<CardActivityPanel>` side-by-side in a flex row

### Client-Side Card Reordering

When implementing visual-only card reordering (e.g., grouping), use `getGroupedCards()` to sort cards by label before rendering. **Important**: card drag-and-drop must be disabled (`isDragDisabled={true}`) when the visual order differs from the DB `index` order, because the optimistic update logic relies on matching array position to DB index.

### Virtual Lists (List-Replacing Group Modes)

The Group button supports two types of modes:
- **Sort modes** (`tag`, `priority`): Reorder cards within existing lists via `getGroupedCards()`
- **List modes** (`tags-list`, `priority-list`, `role-list`): Replace real lists with virtual lists via `getVirtualLists()`. Virtual lists are generated from board labels and contain only cards matching each label. The `List` component accepts `isVirtual` prop to disable editing, adding cards, deleting, and dragging. Label categories:
  - Priority labels: hardcoded as "High Priority", "Medium Priority", "Low Priority"
  - Role labels: hardcoded as "Backend", "Frontend", "Client"
  - Tag labels: all board labels excluding priority and role labels

#### Virtual List Color Tinting

Virtual lists are tinted with their label's `colourCode` to visually distinguish them. The styling differs by theme:

- **Light mode**: Simple hex opacity (e.g., `${colourCode}20`)
- **Dark mode** (Notion-style): Uses `color-mix(in srgb, ...)` to first lighten the color by mixing with white, then apply at low opacity over the dark background. This creates subtle, muted color washes instead of harsh tints. Pattern:
  ```ts
  `color-mix(in srgb, color-mix(in srgb, ${colourCode} 40%, white) 12%, transparent)`
  ```

Dark mode detection for dynamic inline styles uses `useTheme()` from `next-themes` (not Tailwind's `dark:` prefix, which can't handle dynamic values). The `resolvedTheme` property returns `"dark"` or `"light"`.

## Performance

- Implement optimistic updates in UI
- Use tRPC hooks for data fetching efficiently
