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
- Use `usePermissions()` hook — returns `canCreateList`, `canCreateCard`, `canEditList`, `canEditCard`, `canEditBoard`

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
| "New card" Button | inline |
| BoardDropdown | `views/board/components/BoardDropdown.tsx` |

### URL Query Param Pattern for UI State

Filter, grouping, and view state is stored in URL query params (`?members=...&properties=...&groupBy=<groupPublicId>&sort=alphabet&view=sheet`). This uses `next/router`'s `router.query` and `router.push()` to read/write state. Benefits: state survives page refreshes and is shareable via URL.

### Board View Modes

The board supports two view modes, toggled via `ViewSwitchButton` in the toolbar:

- **Kanban** (default, no URL param): Horizontal scroll with `DragDropContext`, `List`, and `Card` components
- **Sheet** (`?view=sheet`): Table view via `SheetView` component (`views/board/components/SheetView.tsx`)

The `viewMode` variable (`(router.query.view as string) || "kanban"`) controls which renders. Key differences:
- Kanban uses `useDragToScroll` (horizontal) and `useScrollRestore`; sheet disables both
- Sheet flattens all cards from all lists into a single array with `listName`/`listPublicId` added to each card
- Sheet reuses `getSortedCards()` for sorting on the flat array (requires type assertion since functions expect `CardData[]`)

#### Sheet View Viewport-Constrained Table

The table fills available viewport height with fixed header/footer and scrollable body:
- Outer wrapper: `flex h-full flex-col` (fills parent, flex column)
- "New card" button takes natural height at top
- Outer scroll spacer: `min-h-0 flex-1` (fills remaining space, provides max-height reference)
- Inner bordered container: `max-h-full overflow-auto rounded-lg border` (shrinks to content when few rows, caps at parent height and scrolls when many rows)
- `thead` row: `sticky top-0 z-10` (header stays fixed at top)
- `tfoot` row: `sticky bottom-0 z-10` (footer stays fixed at bottom)

This two-layer approach (`flex-1` outer + `max-h-full` inner) ensures the border wraps tightly around content when few rows exist, while still capping at viewport height and scrolling when content overflows.

#### Sheet View Inline Editing

Sheet cells use inline editors instead of navigating to card detail:
- **Properties**: `PropertySelector` with `CheckboxDropdown` per group. Calls `api.card.addOrRemoveProperty`
- **Members, List**: `CheckboxDropdown` wraps cell content as trigger. Calls `api.card.addOrRemoveMember`, `api.card.update` respectively
- **Due Date**: `DateSelector` in an absolute-positioned popover with a `fixed` overlay for click-outside dismissal
- **Title**: Click navigates to card detail (only cell that navigates)
- **Progress**: Read-only (derived from checklists)

`SheetView` receives `propertyGroups` prop (from `boardData.propertyGroups`) and passes it to `PropertySelector` for each card row. Mutations are defined directly in `SheetView` using tRPC hooks. After mutations settle, `utils.board.byId.invalidate()` refetches board data.

#### Sheet View Grouped Mode

When `?groupBy=<groupPublicId>` is active, SheetView receives `groups: SheetGroup[]` prop instead of relying on flat card sorting. Each group has `name`, `colourCode`, and `cards`. The board view constructs these from virtual lists via `getPropertyGroupedLists()`. Cards within each group retain their original list context via `cardListNameMap`.

#### CheckboxDropdown Centering Gotcha

`CheckboxDropdown` renders its root `div` with `w-full`, which prevents centering via parent `flex justify-center` alone. To center it within a table cell, wrap it in a `div` with `w-auto` to override the full-width behavior, then use `flex justify-center` on an outer wrapper.

#### CheckboxDropdown Inline Usage

`CheckboxDropdown` accepts an optional `className` prop to override the default `relative flex w-full flex-wrap items-center text-left`. For inline/horizontal layouts (e.g., selectors in a row), pass `className="relative inline-flex items-center text-left"` to prevent full-width expansion. When `className` is provided, the `Menu.Button` also drops `h-full w-full` so the trigger sizes to its content.

### Card Detail Page Layout

The card detail page (`apps/web/src/views/card/index.tsx`) composes up to three panels:

- **Left panel** (`CardPage` default export): Title → inline selectors (List, Properties, Members, Due date) → Editor → Attachments
- **Middle panel** (`CardChecklistPanel`): Checklists — shown/hidden via toggle button with `HiCheckBadge` icon
- **Right panel** (`CardActivityPanel` named export): Activity log → Comments

All panel state is managed by a single `CardPanelsProvider` context (`providers/card-panels.tsx`) accessed via `useCardPanels()`. This replaced the former `ChecklistPanelProvider`, `SidePanelProvider`, and `DraftChecklistProvider` (all deleted).

`PanelOrchestrator` (`components/PanelOrchestrator.tsx`) handles the panel rendering wiring — it reads `useCardPanels()` context and renders the appropriate `SlideInPanel`-wrapped panels. Used in both `CardSlideOver` and full-page card layouts to avoid duplication.

`ChecklistPanelShell` (`views/card/components/ChecklistPanelShell.tsx`) is the shared outer container for both `CardChecklistPanel` and `DraftChecklistPanel`, providing consistent styling (header, empty state, container).

Layout is wired in two places:
- Full page: `pages/cards/[cardId]/index.tsx` passes `CardPanelsProvider` as the `Wrapper` param to `getDashboardLayout(page, <PanelOrchestrator />, true, CardPanelsProvider)`, ensuring context is shared between main content and right panel
- Slide-over: `components/CardSlideOver.tsx` renders a 3-panel flex layout (max-width 1520px) with `CardPanelsProvider` inside `Dialog.Panel`

#### `getDashboardLayout` Wrapper Pattern

`getDashboardLayout` accepts an optional 4th param `Wrapper` (a React context provider component). When provided, it wraps the entire Dashboard (both main content and right panel), enabling context sharing. This is critical for `CardPanelsProvider` so that `PanelOrchestrator` in the right panel and toggle buttons in the main content share the same state.

#### Headless UI Transition.Child Ref Gotcha

`Transition.Child` requires its **direct child** to pass `ref` to a real DOM node. If you wrap the child in a provider/context component that doesn't forward ref, the transition will fail silently. Always place providers **inside** the real DOM element (e.g., inside `Dialog.Panel`), not between `Transition.Child` and `Dialog.Panel`.

### CardSlideOver Modes

`components/CardSlideOver.tsx` supports two modes:

- **View mode** (default): Shows 3-panel layout: `<CardPage>` + `<CardChecklistPanel>` + `<CardActivityPanel>` side-by-side in a flex row
- **Add mode** (`mode="add"`): Shows only `<NewCardPage>` (no activity/checklist panels). Used for creating new cards from the board view

When in add mode, `CardPage` delegates entirely to `NewCardPage` (`views/card/components/NewCardPage.tsx`) — a self-contained component with its own form state, board data fetching, and card creation mutation. `NewCardPage` has its own built-in draft checklist panel (`DraftChecklistPanel`) for managing checklists before the card exists. Both `CardChecklistPanel` and `DraftChecklistPanel` use the shared `ChecklistPanelShell` for consistent outer styling.

#### NewCardPage Property Selectors

`NewCardPage` uses property group selectors (same UI as `PropertySelector`) instead of the old List and Labels selectors:
- Property selections are tracked in `propertyOptionIds` form state (not via API mutations, since the card doesn't exist yet)
- Single-select groups replace the previous selection when a new option is picked (application-level enforcement, same as `PropertySelector`)
- After card creation, all selected property options are attached sequentially via `utils.client.card.addOrRemoveProperty.mutate` in `onSuccess`
- The List selector and Labels selector have been removed — cards go into the lazy-created "General" list, and properties replace labels

### Attached Docs UI

- Attached card docs are rendered by `views/card/components/AttachedDocs.tsx`
- Doc preview panel is `views/card/components/DocViewerPanel.tsx` (read-only BlockNote viewer loaded via `api.doc.byId`)
- In board cards (`views/board/components/Card.tsx`), a doc icon is shown when docs are attached; it takes precedence over the generic description icon
- In slide-over mode, keep the primary card column fixed width (`w-[540px]`) and overflow hidden in `CardSlideOverContent` so child content cannot resize the panel
- For doc chips, use an `overflow-x-auto` container with an `inline-flex` row and `shrink-0` chip items to keep attachments horizontally scrollable instead of resizing the panel

### New Card Flow

There are two ways to create cards from the board:

1. **Quick Add** (default): Clicking the "+" button in a list toggles an inline `QuickAddCardInput` (`components/QuickAddCardInput.tsx`) at the top of the list. Enter submits, Escape cancels. The `useQuickAddCard` hook (`hooks/useQuickAddCard.ts`) handles the mutation with optimistic updates (inserts placeholder card at `position: "start"`). After submit, the input resets and stays open for rapid entry. Clicking the rotated "+" icon again closes it. Works for both real lists and virtual (grouped) lists — for virtual lists, lazily creates a "General" list if needed and attaches the property option via `propertyOptionId` param.

2. **Full form** (slide-over): Still available via `onOpenNewCard` callback prop on `List`, which opens the add-mode `CardSlideOver` with `<NewCardPage>`. Used for cards needing properties, members, checklists, or description before creation.

In **Sheet View**, quick add is available via a "New card" button in the table footer or header. It inserts a row at the top of the table. Cards are created in the first list (`allLists[0]`). The `SheetView` component receives `canCreateCard` prop to conditionally render the UI.

The `List` component now receives a `queryParams` prop (`RouterInputs["board"]["byId"]`) needed by `useQuickAddCard` for cache operations.

### Client-Side Card Reordering

When implementing visual-only card reordering (e.g., grouping), sort cards via `getSortedCards()`. **Important**: card drag-and-drop must be disabled (`isDragDisabled={true}`) when the visual order differs from the DB `index` order, because the optimistic update logic relies on matching array position to DB index.

### Virtual Lists (Property-Based Grouping)

The Group button supports grouping by any property group. URL param: `?groupBy=<groupPublicId>`.

- When active, `getPropertyGroupedLists()` replaces real lists with virtual lists — one per option in the selected group
- Empty groups are included (not filtered out), so status columns like Todo/In Progress/Done always show
- Each virtual list contains only cards that have that option in their `properties`
- Virtual lists have `publicId: "virtual-prop-${option.publicId}"` and the option's `colourCode`
- The `List` component accepts `isVirtual` prop to disable editing, adding cards, deleting, and dragging
- Cards in virtual lists still carry `listName`/`listPublicId` from their original real list (tracked via `cardListNameMap`)

#### Auto-Group on Empty Boards

- When a board loads with no lists and no `groupBy` URL param, the board view auto-selects the "Status" property group via `router.push({ query: { groupBy: statusGroup.publicId } })`
- This makes new boards immediately show the Todo/In Progress/Done virtual columns instead of an empty state

#### Lazy List Creation (`ensureListAndAddCard`)

- New boards have no lists — cards still require a list in the DB, so lists are created lazily
- `ensureListAndAddCard()` (in `board/index.tsx`) checks if any real list exists. If not, creates a "General" list via `utils.client.list.create.mutate`, invalidates the board query, then opens the CardSlideOver in add mode
- Used by the toolbar "New card" button and empty state button
- For quick add in virtual lists, the `List` component handles lazy list creation inline in `handleQuickAddSubmit` before calling `quickCreateCard`

#### Property Filtering (Client-Side)

Property filtering is **client-side only** (not passed as API query params). The `Filters` component writes `?properties=<optionPublicId>` to the URL, and the board view reads `router.query.properties` to filter cards locally:
- In `board/index.tsx`: `filteredLists` filters each list's cards by `propertyFilterIds`
- In `public/board/index.tsx`: `filteredCards` filters cards in each list
- This differs from member/label/list filtering which is server-side via API query params

#### Virtual List Color Tinting

Virtual lists are tinted with their label's `colourCode` to visually distinguish them. The styling uses theme-aware colors via `resolveColour()`:

- **Light mode**: Simple hex opacity (e.g., `${resolvedColour}20`)
- **Dark mode**: Single `color-mix` with resolved dark shade (e.g., `color-mix(in srgb, ${resolvedDarkColour} 12%, transparent)`)

Dark mode detection for dynamic inline styles uses `useTheme()` from `next-themes` (not Tailwind's `dark:` prefix, which can't handle dynamic values). The `resolvedTheme` property returns `"dark"` or `"light"`.

## Performance

- Implement optimistic updates in UI
- Use tRPC hooks for data fetching efficiently

## BlockNote Editor

The project uses BlockNote (`@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`) for rich text editing.

### Shared Components & Hooks

| File | Purpose |
|------|---------|
| `components/BlockNote.tsx` | Reusable `<BlockNote>` wrapper with formatting toolbar (extracted `Toolbar` component at module scope). Accepts `BlockNoteEditor<any,any,any>` so custom-schema editors don't need `as any` casts. |
| `components/blocknote-specs/` | BlockNote inline content specs and utilities, split into focused modules (see below). |
| `components/blocknote-specs/mention-spec.tsx` | `mentionInlineContentSpecs` bundle: `mention` (`@member`) and `docMention` (`@doc`) inline content specs |
| `components/blocknote-specs/label-ref-spec.tsx` | `labelRefInlineContentSpecs` bundle: `labelRef` (`#label`) inline content spec |
| `components/blocknote-specs/suggestions.ts` | `getMentionItems()`, `getLabelRefItems()` and their types (`MentionSuggestionItem`, `LabelRefSuggestionItem`) |
| `components/blocknote-specs/extract.ts` | Tree-walking extractors: `extractDocMentionIds()`, `extractLabelRefIds()`, `hasInlineMentions()`. All delegate to `extractInlineContentIds()` / `hasInlineContentOfType()` from `@kan/shared/utils` |
| `components/blocknote-specs/types.ts` | Shared types: `MentionMember`, `MentionDoc`, `LabelRefItem` |
| `hooks/useBlockNoteEditor.ts` | Shared hook: editor creation, theme sync, initial content loading, `getFullText()`, `focus()`, `isReady`. Accepts optional `schema` and `initialContent` (supports both HTML strings and JSON block arrays). |
| `views/docs/components/DocEditorForCard.tsx` | Card description editor. `forwardRef` exposing `focus()` and `getDocument()`. Accepts `workspaceMembers` to enable `@`-mentions. Returns JSON blocks via `onUnmountSnapshot` and `onChange`. |
| `views/docs/components/DocEditorInner.tsx` | Full-page doc editor with title + word count. Lazy doc creation on first edit, debounced autosave (1.5s), URL replacement for new docs. Uses `labelRefInlineContentSpecs` schema with `#` label picker via `SuggestionMenuController`. Auto-syncs doc-label junction on every save via `extractLabelRefIds()` + `doc.syncLabels` mutation. Also uses `useBlockNoteEditor` hook. |
| `views/docs/components/DocEditor.tsx` | Wrapper that fetches existing doc data via `api.doc.byId` and renders `DocEditorInner` (dynamic import, SSR disabled). |

### BlockNote Gotchas

- **`SuggestionMenuController` must be a child of `BlockNoteView`** (i.e., inside `<BlockNote>` children), not a sibling. Otherwise: "useBlockNoteEditor was called outside of a BlockNoteContext provider"
- **`createReactInlineContentSpec`** expects React components (JSX) for `render` and `toExternalHTML`, not vanilla DOM factories returning `{ dom }`
- **`BlockNote` component accepts `children`** — pass context-dependent children (like `SuggestionMenuController`) through this prop so they render inside `BlockNoteView`
- When using custom inline content (e.g., mentions), create a schema with `BlockNoteSchema.create({ inlineContentSpecs: mentionInlineContentSpecs })` and pass to `useBlockNoteEditor({ schema })`
- Mention data flows: `NewCardPage` maps `WorkspaceMember[]` → `MentionMember[]` → `DocEditorForCard` prop → creates schema → `SuggestionMenuController`
- `DocEditorForCard` should preserve mention-only content (no plain text) by treating inline mention nodes as meaningful content. Use `hasInlineMentions()` from `~/components/blocknote-specs` before collapsing to `[]`
- **Case-sensitive import**: The directory `components/blocknote-specs/` and file `components/BlockNote.tsx` differ only in casing. On macOS (case-insensitive FS), `~/components/blocknote-specs` resolves to the directory, `~/components/BlockNote` resolves to the file. Do not use `~/components/blocknote` (without the `-specs` suffix) — it will resolve to `BlockNote.tsx` on macOS.

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

### Label References in Doc Editor (`#` trigger)

- Label ref spec (`labelRef`) is a BlockNote inline content spec in `components/blocknote-specs/label-ref-spec.tsx`
- Triggered by `#` character in `DocEditorInner` via `SuggestionMenuController`
- Renders as a colored badge using the label's `colourCode` (background at `${colour}25`, text in `colour`, border at `${colour}30`)
- Props: `id` (label publicId), `name`, `colourCode`
- `getLabelRefItems(labels, query)` — filters workspace labels by name matching query
- `extractLabelRefIds(blocks)` — delegates to generic `extractInlineContentIds(blocks, ["labelRef"])` from `@kan/shared/utils`
- `labelRefInlineContentSpecs` — separate specs export (does not include mention/docMention specs)
- Auto-sync flow in `DocEditorInner`:
  1. On every editor change → debounced save (1.5s)
  2. `saveDoc` calls `updateDoc.mutate` + `syncLabelsForDoc` (extracts label IDs via `extractLabelRefIds` and calls `doc.syncLabels` mutation)
  3. Junction table is diff-synced (adds missing labels, removes extras)
- `DocEditorInner` fetches workspace labels via `api.label.listByWorkspace.useQuery({ workspacePublicId })`
- BlockNote schema uses `BlockNoteSchema.create({ inlineContentSpecs: labelRefInlineContentSpecs })`, passed to `useBlockNoteEditor({ schema })`
- `SuggestionMenuController` with `triggerCharacter="#"` must be inside `<BlockNote>` children (same rule as `@` mentions)

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

### Property Groups & Options UI

- **PropertySelector** (`components/PropertySelector.tsx`): Universal component for toggling property options on a card. Accepts `groups` (PropertyGroup[]) and `cardPropertyIds` (string[] of selected option publicIds). Uses `CheckboxDropdown` per group. Invalidates both `card.byId` and `board.byId` on mutation settle (needed because it's used in both card detail and SheetView contexts). Accepts optional `onMutationSettled` callback for additional invalidation.
- **PropertyGroupManager** (`components/PropertyGroupManager.tsx`): Notion-style board-level panel for CRUD on groups and their options. Uses `InlineEdit` for click-to-rename on group/option names, inline expanding color picker (replaces `Popover`), star toggle for `showOnCard` visibility, click-to-toggle type badge (Single/Multi), and `Transition` for expand/collapse. Delete buttons are hover-reveal via `group/name` Tailwind groups. Options are shown as a vertical list with left-border tree indentation. Auto-selects an unused color when adding new options. Uses `resolveColour()` from `@kan/shared/constants` for theme-aware color display.

#### Color Picker (PropertyGroupManager)

- Previously used `@headlessui/react` `Popover`. Now replaced with inline expanding strip that appears above the option row.
- Colors are reordered so the currently selected color appears first, remaining colors flow right
- Animation: `color-expand` keyframe from scale 0.3 to 1, staggered 30ms delays, runs on strip open
- Uses `useTheme()` to resolve light/dark mode colors via `resolveColour(code, isDark)`

#### showOnCard Toggle

- Star button (`HiStar`) on each group, placed before the Single/Multi toggle
- Filled amber star = visible on cards (`showOnCard: true`)
- Outline star = hidden from cards (`showOnCard: false`)  
- Clicking toggles the `showOnCard` boolean via `api.propertyGroup.update` mutation
- `PropertyGroup` interface in `PropertyGroupManager.tsx` includes `showOnCard: boolean`

#### Filters (`views/board/components/Filters.tsx`): Updated to use `propertyGroups` instead of hardcoded `labels`/`lists`. Filter sections auto-generated from property groups. URL param: `?properties=<optionPublicId>`.
- **GroupButton** (`views/board/components/GroupButton.tsx`): Updated to use `propertyGroups` instead of hardcoded group modes. URL param: `?groupBy=<groupPublicId>`.

#### Board Card Properties

- `Card` component (`views/board/components/Card.tsx`) accepts optional `properties` prop: `{ publicId: string; name: string; colourCode: string | null; groupId: number }[]`
- **No longer accepts or renders `labels` prop** — removed in favor of properties-only display
- When `properties` is present and non-empty, renders property badges (colored dots + name)
- Board view passes `properties={card.properties}` from `boardData.lists[].cards[]`, pre-filtered by `showOnCard` status

#### Card Detail Properties

- `CardPage` (`views/card/index.tsx`) renders `<PropertySelector>` with `groups={board?.propertyGroups ?? []}` and `cardPropertyIds={card.properties?.map((p) => p.publicId) ?? []}`
- `PropertySelector` calls `api.card.addOrRemoveProperty` for each toggle
- Card detail also still has `LabelSelector` (used for legacy labels during transition)

#### Sheet View Properties

- `SheetView` receives `propertyGroups` prop and renders `PropertySelector` per card row
- `SheetCard` type includes `properties: { publicId, name, colourCode, groupId }[]`
- `SheetViewProps` type includes `propertyGroups: { publicId, name, type, index, options: [...] }[]`

#### PropertyGroupManager Access

- Opened from `BoardDropdown` via "Properties" menu item (`HiOutlineSwatch` icon)
- Modal type: `PROPERTY_GROUPS`, rendered inline in `renderModalContent()` in board view
- Manages full CRUD: create/edit/delete groups and options with colour picker

#### Type Conventions for Property Components

- `PropertyGroup.type` uses `string` (not literal union) in frontend types to match `z.string()` in Zod schemas
- `PropertySelector`, `PropertyGroupManager`, `GroupButton`, `Filters` all define local `PropertyGroup` interface with `type: string`
- `PropertySelector` accepts `groupId` as optional on option items to handle both board-level option definitions and card-level property instances

### Virtual List Card Creation (`virtualListOptionId`)

When adding a card from a virtual list (grouped by property), the property option must be attached so the card appears in the correct group:

1. The board view passes `virtualListOptionId` prop to `List` (extracted from the virtual list's `publicId` by stripping `"virtual-prop-"` prefix)
2. `List` uses the quick add input for virtual lists too (same UI as real lists)
3. `handleQuickAddSubmit` lazily creates a "General" list if needed, then calls `quickCreateCard(title, realListId, virtualListOptionId)`
4. `useQuickAddCard` stores the `propertyOptionId` in a ref and attaches it in `onSuccess` via `card.addOrRemoveProperty`
