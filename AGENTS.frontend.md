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

The card detail page (`apps/web/src/views/card/index.tsx`) composes up to three panels:

- **Left panel** (`CardPage` default export): Title → inline selectors (List, Labels, Members, Due date) → Editor → Attachments
- **Middle panel** (`CardChecklistPanel`): Checklists — shown/hidden via toggle button with `HiCheckBadge` icon
- **Right panel** (`CardActivityPanel` named export): Activity log → Comments

The `ChecklistPanelProvider` context (`apps/web/src/providers/checklist-panel.tsx`) shares panel open/close state between CardPage (toggle button) and CardChecklistPanel.

`SidePanelProvider` (`apps/web/src/providers/side-panel.tsx`) manages mutually-exclusive right-side panels for:
- Activity panel (`activePanel: "activity"`)
- Doc viewer panel (`activePanel: "doc"`, stores `docPublicId`)

Use `useSidePanel()` (not `useActivityPanel()`) in card full-page and slide-over layouts when doc viewing is enabled.

Layout is wired in two places:
- Full page: `pages/cards/[cardId]/index.tsx` wraps layout in `ChecklistPanelProvider`, composes `CardChecklistPanel` + `CardActivityPanel` in flex container passed to `getDashboardLayout(page, rightPanel, true)`
- Slide-over: `components/CardSlideOver.tsx` renders a 3-panel flex layout (max-width 1520px) with `ChecklistPanelProvider` inside `Dialog.Panel`

#### Headless UI Transition.Child Ref Gotcha

`Transition.Child` requires its **direct child** to pass `ref` to a real DOM node. If you wrap the child in a provider/context component that doesn't forward ref, the transition will fail silently. Always place providers **inside** the real DOM element (e.g., inside `Dialog.Panel`), not between `Transition.Child` and `Dialog.Panel`.

### CardSlideOver Modes

`components/CardSlideOver.tsx` supports two modes:

- **View mode** (default): Shows 3-panel layout: `<CardPage>` + `<CardChecklistPanel>` + `<CardActivityPanel>` side-by-side in a flex row
- **Add mode** (`mode="add"`): Shows only `<NewCardPage>` (no activity/checklist panels). Used for creating new cards from the board view

When in add mode, `CardPage` delegates entirely to `NewCardPage` (`views/card/components/NewCardPage.tsx`) — a self-contained component with its own form state, board data fetching, card creation mutation, and label modals. `NewCardPage` has its own built-in draft checklist panel (`DraftChecklistPanel`) for managing checklists before the card exists.

### Attached Docs UI

- Attached card docs are rendered by `views/card/components/AttachedDocs.tsx`
- Doc preview panel is `views/card/components/DocViewerPanel.tsx` (read-only BlockNote viewer loaded via `api.doc.byId`)
- In board cards (`views/board/components/Card.tsx`), a doc icon is shown when docs are attached; it takes precedence over the generic description icon
- In slide-over mode, keep the primary card column fixed width (`w-[540px]`) and overflow hidden in `CardSlideOverContent` so child content cannot resize the panel
- For doc chips, use an `overflow-x-auto` container with an `inline-flex` row and `shrink-0` chip items to keep attachments horizontally scrollable instead of resizing the panel

### New Card Flow

Creating cards from the board uses the add-mode `CardSlideOver` instead of a modal. The board view (`views/board/index.tsx`) manages `newCardSlideOver` state (isOpen, listPublicId, pre-selections) and renders `<CardSlideOver mode="add" ... />`. The `List` component triggers this via its `onOpenNewCard` callback prop. After card creation, `NewCardPage` persists draft checklists via sequential `checklist.create` and `checklist.createItem` API calls.

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

## BlockNote Editor

The project uses BlockNote (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`) for rich text editing.

### Shared Components & Hooks

| File | Purpose |
|------|---------|
| `components/BlockNote.tsx` | Reusable `<BlockNote>` wrapper with formatting toolbar. Accepts `editable`, `className`, `children` props. Children render inside `BlockNoteView` context. |
| `components/MentionSpec.tsx` | `@`-mention inline content spec for BlockNote. Exports `MentionMember`, `getMentionItems()`, `mentionInlineContentSpecs` |
| `hooks/useBlockNoteEditor.ts` | Shared hook: editor creation, theme sync, initial content loading, `getFullText()`, `focus()`, `isReady`. Accepts optional `schema` and `initialContent` (supports both HTML strings and JSON block arrays). |
| `views/docs/components/DocEditorForCard.tsx` | Card description editor. `forwardRef` exposing `focus()` and `getDocument()`. Accepts `workspaceMembers` to enable `@`-mentions. Returns JSON blocks via `onUnmountSnapshot` and `onChange`. |
| `views/docs/components/DocEditorInner.tsx` | Full-page doc editor with title + word count. Lazy doc creation on first edit, debounced autosave (1.5s), URL replacement for new docs. Also uses `useBlockNoteEditor` hook. |
| `views/docs/components/DocEditor.tsx` | Wrapper that fetches existing doc data via `api.doc.byId` and renders `DocEditorInner` (dynamic import, SSR disabled). |

### BlockNote Gotchas

- **`SuggestionMenuController` must be a child of `BlockNoteView`** (i.e., inside `<BlockNote>` children), not a sibling. Otherwise: "useBlockNoteEditor was called outside of a BlockNoteContext provider"
- **`createReactInlineContentSpec`** expects React components (JSX) for `render` and `toExternalHTML`, not vanilla DOM factories returning `{ dom }`
- **`BlockNote` component accepts `children`** — pass context-dependent children (like `SuggestionMenuController`) through this prop so they render inside `BlockNoteView`
- When using custom inline content (e.g., mentions), create a schema with `BlockNoteSchema.create({ inlineContentSpecs: mentionInlineContentSpecs })` and pass to `useBlockNoteEditor({ schema })`
- Mention data flows: `NewCardPage` maps `WorkspaceMember[]` → `MentionMember[]` → `DocEditorForCard` prop → creates schema → `SuggestionMenuController`
- `DocEditorForCard` should preserve mention-only content (no plain text) by treating inline mention nodes as meaningful content. Use a helper like `hasInlineMentions()` before collapsing to `[]`
- `DocEditorForCard` passes editor as `any` to `<BlockNote />` to satisfy type mismatch between custom schema editor and component typing

### Doc Mentions in Card Descriptions

- Mention spec supports two inline nodes:
  - `mention` for workspace members
  - `docMention` for workspace docs (`data-type="docMention"`, includes id + label)
- `getMentionItems()` merges member and doc suggestions into one `@` menu and tags each suggestion with `kind: "member" | "doc"`
- `extractDocMentionIds()` walks BlockNote blocks recursively and returns all referenced doc IDs from `docMention` inline content
- `CardPage` uses this ID extraction to:
  - auto-attach docs when doc mentions are inserted (`card.addOrRemoveDoc`)
  - flush pending description autosave before doc-attach mutation when inserting a doc mention, to keep persisted description and card-doc junction state in sync
  - show only docs currently referenced in the description
  - detach docs removed from mentions during the close flush sequence

### Click-to-Focus Pattern

`CardPage` and `NewCardPage` both have `onClick` on their scrollable content area that focuses the editor. The handler skips interactive elements (buttons, links, inputs, selects, dropdowns, editor itself). Uses `DocEditorForCardHandle.focus()` via `forwardRef`/`useImperativeHandle`.

### Card Description Autosave

Card descriptions now autosave with a debounced flush pattern:
- `DocEditorForCard` emits JSON blocks (not HTML) via `onChange` and captures final content via `onUnmountSnapshot` on unmount
- `CardPage` tracks `latestDescriptionRef` and `hasPendingDescriptionSaveRef`, debounces saves (1.5s), and flushes on slide-over close via `registerBeforeClose`
- Before saving, it compares with `JSON.stringify()` to detect actual changes, and sets `silent: true` on description-only saves (no activity logged)
- The card cache is optimistically updated via `utils.card.byId.setData` before the network request fires

### Docs feature Pages

- **Docs listing** (`views/docs/index.tsx`): Grid of doc cards with title + date. Uses `api.doc.list` query. Empty state shown when no docs.
- **New doc** (`pages/docs/new.tsx`): Creates doc lazily on first edit. After creation, URL is replaced to `/docs/{publicId}` via `router.replace` (shallow).
- **Existing doc** (`pages/docs/[docId].tsx`): Loads via `api.doc.byId`, renders `DocEditor` wrapper which dynamically imports `DocEditorInner`.
- `DocEditorInner` handles lazy doc creation: first content change triggers `doc.create` mutation, subsequent edits use debounced `doc.update`. Save is flushed on unmount.
