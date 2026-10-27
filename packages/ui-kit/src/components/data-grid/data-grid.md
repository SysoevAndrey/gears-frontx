# DataGrid

A server-driven data grid: a `DataGrid` that renders rows through the kit's
`Table`, a `load(ctx)` callback that fetches them, a slot-based layout around
the table, and plugins that add behavior (paging, search, sorting, filters, a
custom empty state) by registering into those slots and hooking the load. Each concern
(load, layout, table, storage, persistence) is a service with its own store, and
a plugin reaches all of them through one context object.

Built-in plugins: pagination, text search, order, filters, empty state, row number, each its
own entry (see below).
its own entry (see below).

## When to use

- A list backed by an API that pages, searches and sorts on the server, where
  the page, the query and the order must survive a reload or live in the URL.
- A list whose behavior you want to extend by composition: each feature is a
  child component of `DataGrid`, and you can write your own the same way
  (see "Custom plugins").

## When not to use

- Static, already-loaded rows with at most client-side sorting and paging -
  use `DataTable`.
- Plain tabular markup you will drive yourself - use `Table`.

## Imports and entries

The grid is split in entries so a grid that uses no plugin ships none of their
code or CSS:

| Entry | Exports |
|-------|---------|
| `@gears-frontx/ui-kit/data-grid` | `DataGrid`, `createDataGridPlugin`, `useDataGrid`, `useDataGridPluginContext`, `useDataGridRecord`, `useDataGridActiveView`, `DATA_GRID_VIEW`, and the types |
| `@gears-frontx/ui-kit/data-grid/pagination` | `DataGridPaginationPlugin` |
| `@gears-frontx/ui-kit/data-grid/text-search` | `DataGridTextSearchPlugin` |
| `@gears-frontx/ui-kit/data-grid/order` | `DataGridOrderPlugin`, `createDataGridOrderOption` |
| `@gears-frontx/ui-kit/data-grid/filters` | `DataGridFiltersPlugin`, the entity factories `filterSearch`, `filterToggle`, `filterCheckboxGroup`, `filterTagGroup`, `filterTree` and `filterDateRange`, `createDataGridTreeStructure` and `useDataGridTreeStructure` (the tree `filterTree` takes), and the types |
| `@gears-frontx/ui-kit/data-grid/empty-state` | `DataGridEmptyStatePlugin` |
| `@gears-frontx/ui-kit/data-grid/row-number` | `DataGridRowNumberPlugin` |

The package root re-exports all of them, so
`import { DataGrid, DataGridPaginationPlugin } from '@gears-frontx/ui-kit'`
works too; a bundler that honors `sideEffects` keeps only what is used. The core
entry never imports a plugin. The core and every plugin entry carry `'use client'`,
so a Server Component can import and render them; props that are functions
(`load`, a column's `render`) have to come from a Client Component.

## Quick start

```tsx
import {
  DataGrid,
  DataGridOrderPlugin,
  DataGridPaginationPlugin,
  DataGridTextSearchPlugin,
  type DataGridLoadContext,
  type DataGridTableColumn,
} from '@gears-frontx/ui-kit';

interface User {
  id: number;
  name: string;
  email: string;
}

async function loadUsers({ pagination, filters, order, signal }: DataGridLoadContext) {
  const response = await fetchUsers({
    page: pagination?.page ?? 1,
    limit: pagination?.limit ?? 12,
    search: filters?.textSearch?.value,
    sort: order?.[0],
    signal,
  });

  return { results: response.users, total: response.total };
}

const columns: DataGridTableColumn<User>[] = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
];

function UsersPage() {
  return (
    <DataGrid<User> name="users" load={loadUsers} columns={columns} persistent="localStorage">
      <DataGridTextSearchPlugin />
      <DataGridOrderPlugin />
      <DataGridPaginationPlugin defaultLimit={12} limits={[12, 24, 48]} />
    </DataGrid>
  );
}
```

`columns` and `implicitFilterKeys` must keep their identity between renders (a
module-level constant, or `useMemo`): a new array each render is read as a
change and recomputes the grid's derived state. The built-in plugins compare
their own array props by content, so an inline `limits` or `options` is fine; a
plugin you write compares by reference unless you give it `propsAreEqual`.

## The `load` contract

`DataGrid` calls `load` once on mount and again whenever a plugin asks for a
reload (a page change, a search, a sort). It hands it a `DataGridLoadContext`, which the
plugins fill in, and expects a `DataGridLoadResult`.

| `DataGridLoadContext` field | Set by | Shape |
|---------------------|--------|-------|
| `pagination` | pagination plugin | `{ page: number; limit: number }`, page is 1-based |
| `filters` | text search plugin, and any plugin that registers one | `Record<string, { value, ... }>` keyed by filter key; text search writes `filters.textSearch` |
| `order` | order plugin | `{ column: string; direction: 'asc' \| 'desc' }[]`, absent when nothing is sorted |
| `signal` | the grid | an `AbortSignal`, aborted when a refresh replaces the load or the grid unmounts |

`DataGridLoadResult` is `{ results: TItem[]; total?: number }`. `total` is what the pager
counts; leave it out and the pager shows one page. A result without `results` is a
failed load, not an empty grid.

A plugin is not wired to your backend: it contributes to the context, and your
`load` has to read it (`filters.textSearch?.value`, `order?.[0]`).

If the first load fails, the grid shows an error view in place of itself and
logs the error to the console in development. It has no retry and a failed first
load stays failed; a failed later load has no UI of its own. Handle failures you
want shown inside `load`.

## Columns

Each entry of `columns` is a `DataGridTableColumn`, or a `DataGridTableGroup` holding columns
under a spanning header cell.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Required, **snake_case** (`user_name`). Checked when the columns arrive and throws otherwise: ids travel into plugins, storage and analytics. |
| `key` | `string` | The item field to show. Defaults to `id`; a dotted path (`owner.name`) reads nested values. |
| `label` | `string \| () => string` | Header text. A function is called on every render, for a label that changes with locale. |
| `render` | `(item) => ReactNode \| ReactNode` | Cell content. Wins over `component` and `key`. |
| `component` | `ComponentType<{ item, column, value }>` | Cell component. |
| `formatter` | `(value) => string` | Formats the value when neither `render` nor `component` is set. |
| `headerComponent` | `ComponentType<{ column }>` | Replaces the header label (for example a select-all checkbox). |
| `width` | `number \| string \| 'min-content'` | See "Choosing column widths". |
| `minWidth`, `maxWidth` | `number` | Pixels. Independent floor and cap under `tableLayout="auto"`. |
| `headerOverflow` | `'nowrap' \| 'wrap'` | Default `'nowrap'`: one line, clipped with an ellipsis, the label in `title`. |
| `cellOverflow` | `'wrap' \| 'nowrap'` | Default `'wrap'`. `'nowrap'` clips with an ellipsis and sets `title` to the value. |
| `sticky` | `boolean` | Pins the column to the inline-start edge while the table scrolls sideways. |
| `visible` | `boolean` | Initial visibility. |
| `visibleToggleDisabled` | `boolean` | The column's visibility is not the user's to change. |
| `getClassName` | `(item) => string \| undefined` | A class for the column's cell in that row. |
| `type` | `'string' \| 'number' \| 'date'` | Declared on the type; nothing in the grid reads it yet (the order plugin's option `type` is what names the directions). |
| `groupId` | `string` | Set by the grid on columns inside a `DataGridTableGroup`; do not set it. |

A `DataGridTableGroup` is `{ id, label, columns, component?, visible?, sticky? }`; a
group's `sticky` pins all its columns. Pin a group as a whole or none of its
columns: a column pinned or unpinned on its own inside a group moves in the body
but not under the group's header, so the header labels stop matching their
columns (see "Known limitations").

Pass a component to a column as its own module-level component, not an inline
function: an inline component is a new component on every render and loses its
state.

### `tableLayout`

`'fixed'` (the default) shares one weighted track between the columns, computed
from the header row, so content never changes an already-rendered column's width.
`'auto'` sizes columns to their content, with `minWidth` and `maxWidth` as
independent floor and cap. This is the table's CSS `table-layout`, unrelated to
the slot layout below.

In both modes the table never shrinks below its content's natural width
(`min-inline-size: max-content`), so a grid with many columns scrolls sideways
rather than squeezing every column; the floor is adjustable (see "CSS
customization").

Under `'fixed'` the three width props collapse into one track: a lone `width`,
`minWidth` or `maxWidth` is the track, and combining them logs a development-only
warning (`width` wins). Under `'auto'`, if every column has a `width` or
`maxWidth` and the container is wider than their sum, the browser grows them all
past their caps and capped columns show trailing blank space; leave at least one
column unconstrained to absorb the slack (a development-only warning says so).

### Choosing column widths

1. Start from `tableLayout="fixed"`: it fills the container and keeps widths
   stable when the page content changes.
2. Classify each column. Long variable text (titles, descriptions) should grow.
   Bounded variable content (dates, statuses, ids) has a known range. Fixed-shape
   content (action buttons, avatars, checkboxes) is always the same width. Names
   look like long text but behave like bounded content.
3. Give long text no `width` so it absorbs the slack, bounded content a pixel
   `width` sized to its widest value plus padding, and fixed-shape content
   `width: 'min-content'` when the header defines the width (a pixel `width` when
   the body is wider than the header).
4. Route the slack on purpose. Under `'fixed'` a track holds only while at least
   one column stays flexible; give every column a `width` and they all stretch in
   proportion. Several long-text columns share the slack evenly when none has a
   `width`. Extra columns a plugin adds with no width are flexible too.
5. A flexible column in a narrow container can collapse to a word per line; a
   definite track (a `width`, or a lone `minWidth`) gives it a floor while the
   table scrolls around it. If the grid only starves in a narrow pane, raise the
   table's floor with `--data-grid-table-min-inline-size` and leave the columns
   alone.
6. Bodies default to `'wrap'` and headers to `'nowrap'`. Do not truncate
   identifier or code columns: they must stay readable and copyable in full.
7. Reach for `tableLayout="auto"` only when a grid must shrink to its content or
   needs caps `'fixed'` cannot express.

Give peer columns of one type (two date columns) one identical width, so one does
not wrap while its twin does.

### `stickyHeader`

`stickyHeader` pins the header row to the top of the grid's scroll area while the
rows scroll under it, with the cells on an opaque fill. Pinned columns keep
working, and the corner cells stick on both axes. With column groups both header
rows stay pinned.

It only takes effect when the surrounding layout bounds the grid's height, so
that the grid scrolls internally: every ancestor between an element with a
definite height and the grid must be a flex column that may shrink. On a grid
that grows to its content the header scrolls away with the rows.

```css
.grid-host {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-block-size: 0;
}
```

The header fill is `--card`; set `--data-grid-header-background` to change it.

## Loading

While a load is in flight the grid is dimmed behind a scrim with a spinner
centered over it. The rows stay on screen underneath, so the grid keeps its shape
and scroll position, but they read as stale. The scrim covers the grid's own
regions - toolbar, rows and pagination - and takes the pointer events over them.
The first load is the exception: there is nothing to cover yet, so the grid shows
a centered spinner in its place.

The scrim and the spinner fade in after a short delay, so a load that settles
quickly shows nothing, and the content region carries `aria-busy="true"` while
either is on screen. The block is pointer-only: the covered controls stay in the tab
order and activatable from the keyboard.

Loads that only add to the grid (and so do not replace what you are looking at)
leave it alone.

### `loading`

Use `loading` for work the grid never reloads for, such as a bulk copy started
elsewhere:

```tsx
<DataGrid name="terms" load={loadTerms} columns={columns} loading={isCopying} />
```

Hold the flag on the screen that renders the grid rather than inside the thing
that started the work, so the overlay survives that thing going away. It is OR-ed
with the grid's own loads, and there is no imperative equivalent.

## Empty state

A grid with no records shows a centered `Empty` instead of the table: "No results
found", with a "Try adjusting your search or filters" line when a filter is
applied (`hasActiveFilters`). To replace it, use `DataGridEmptyStatePlugin`.

### `implicitFilterKeys`

`hasActiveFilters` counts every filter key in the load context, including filters
the grid always sends on its own (a tenant or team taken from outside it). List
those keys to keep them out of the count, so an empty grid reaches its unfiltered
empty state:

```tsx
const IMPLICIT_KEYS = ['teamId'];

<DataGrid name="users" load={loadUsers} columns={columns} implicitFilterKeys={IMPLICIT_KEYS} />;
```

Only for filters with no control in the grid to clear them: a key the user can
clear belongs nowhere near this list, or they are stranded on an unfiltered empty
state with a filter still applied. The array must be referentially stable.

## Layout slots

The grid lays itself out in named slots, and plugins register components into
them with `registerSlot(name, { id, component, order? })`:

| Slot | Where |
|------|-------|
| `top-start` | Left of the toolbar (search, filters) |
| `top` | The whole toolbar row, replacing the two halves when its `active` option is set |
| `top-end` | Right of the toolbar (order button, actions) |
| `main` | The primary content: the table view is the default one |
| `bottom` | The footer (pagination); hidden while the grid has no records |
| `empty` | Replaces the built-in empty state |

The toolbar fits itself to the grid's width. What `top-start` holds flows onto
further lines when it is too wide for one, and `top-end` goes on to a line of its
own, at its end, when it would not fit beside `top-start` on a single line. A
toolbar that fits on one line has everything centred on it.

With two or more `main` views (for example the table and a cards view) the grid
adds a view switch to `top-end` by itself. Read or set the active view with
`useDataGridActiveView()` and `DATA_GRID_VIEW`:

```tsx
const view = useDataGridActiveView(); // 'table_layout' | 'cards_layout' | undefined
grid.setActiveSlotId('main', DATA_GRID_VIEW.cards);
```

The `main` slot is hidden when the grid is empty and nothing is filtered, which is
why the empty state has a slot of its own.

## Persistence

`persistent` chooses where grid state (page and limit, search, order, and the
state of plugins that register any) is kept:

| Value | Where |
|-------|-------|
| `'localStorage'` (default) | Survives sessions |
| `'sessionStorage'` | Cleared when the tab closes |
| `'router'` | The URL query: `history.replaceState` on the current path, one query key per state |
| `'memory'` | Within one mount; a remount or reload starts clean |

Storage keys are `dataGrid:${name}:${key}`, with a JSON value, so a grid's `name`
is its identity: two grids with the same name on one page share state. A stored
value is user-editable (devtools, the address bar), so a value that is not valid
JSON reads as absent, and plugins narrow what they read.

Router mode writes the URL directly with bare keys, shared by every grid on the
page, and does not listen for `popstate`; a plugin can opt a state out of it
(`registerPersistentState(key, { router: false })`) or send one state to another
backend (`{ storage: 'localStorage' }`).

`persistentColumnVisibility` remembers which columns the user showed or hid, in
`localStorage` whatever `persistent` says. The grid ships no control that changes
it; a plugin of your own calls `updateColumnVisibility`.

## Plugins

Plugins are children of `DataGrid`. They render nothing themselves: each one
registers its UI into a slot and its behavior into the load, once, when it mounts.

### `DataGridPaginationPlugin`

Draws a pager in the `bottom` slot and fills `DataGridLoadContext.pagination`.

| Prop | Type | Default |
|------|------|---------|
| `defaultLimit` | `number` | `12` |
| `limits` | `number[]` | `[12, 24, 48, 96]`; the page-size selector appears with more than one |
| `autoHide` | `boolean` | `false`; hides the pager when everything fits the smallest limit |

A page change updates the page, stores it and reloads. A limit change goes back to
page 1, stores the limit and reloads. A refresh resets the page to 1. The page
count comes from `total`. The loading treatment is the grid's, not the pager's.
In a container too narrow for one row, the page buttons wrap to a centred line
under the page-size selector and the page text.

### `DataGridTextSearchPlugin`

Draws a search box in `top-start` and contributes the query to the load as
`filters[filterKey] = { value }` (default key `textSearch`); your `load` reads it.

| Prop | Type | Default |
|------|------|---------|
| `filterKey` | `string` | `'textSearch'` |
| `placeholder` | `string` | `Search...` |
| `fullWidth` | `boolean` | `false`; stretches across the free `top-start` space |

Typing shows at once and reloads 300 ms after the user stops. The clear button
cancels a pending reload, reloads immediately with no query, and keeps focus in
the field. A refresh that resets filters empties the box. Its API
(`getPlugin<DataGridTextSearchPluginApi>('textSearch')`) offers `useQuery`,
`usePlaceholder`, `useFullWidth`, `setSearch` (immediate) and `updateSearch`
(debounced).

### `DataGridOrderPlugin`

Header sorting plus an optional toolbar button; fills `DataGridLoadContext.order`.

| Prop | Type | Notes |
|------|------|-------|
| `options` | `DataGridOrderOption[]` | `createDataGridOrderOption({ id, label, type? })`. With options the toolbar button appears in `top-end`; `type` (`'string'`, `'number'`, `'date'`) names the directions A-Z, 0-9 or Oldest first. |
| `excludedColumns` | `string[]` | No header sort control for these. A column in both `excludedColumns` and `options` is sortable from the button only. |
| `defaultOrder` | `{ id, direction }` | Applies when nothing usable is stored. It seeds an order, it does not keep governing one. |
| `popover` | `{ minInlineSize }` | Sizes the button's popover. |

A header label is a button: the first click sorts descending, the second
ascending, the third clears the sort (and keeps `defaultOrder` suppressed on
later visits). The sorted column shows a direction icon that advances the same
cycle. The toolbar button changes the column and the direction, and never clears.
The order is stored; one whose column is orderable nowhere (excluded and not
offered) is withheld rather than deleted, so it returns if the column is offered
again.

The plugin compares `options` and `excludedColumns` by content, so an inline
array does not count as a change.

### `DataGridFiltersPlugin`

A bar of quick filters in `top-start`, and an "All filters" panel that edits the
same filters in one go. Each active filter reaches your `load` as
`filters[filterKey] = { value }`.

```tsx
import {
  DataGridFiltersPlugin,
  filterCheckboxGroup,
  filterDateRange,
  filterToggle,
} from '@gears-frontx/ui-kit/data-grid/filters';

const ENTITIES = [
  filterToggle({ id: 'only_active', label: 'Only active' }),
  filterCheckboxGroup({
    id: 'role',
    label: 'Role',
    options: [
      { label: 'Admin', value: 'admin' },
      { label: 'Member', value: 'member' },
    ],
  }),
  filterDateRange({ id: 'created_at', label: 'Created' }),
];

async function loadUsers({ filters }: DataGridLoadContext) {
  const roles = filters?.role?.value; // ['admin'], when the Role filter holds a choice
  const range = filters?.created_at?.value; // { from?: '2026-03-01', to?: '2026-03-31' }
  // ...
}

<DataGrid name="users" load={loadUsers} columns={columns}>
  <DataGridFiltersPlugin entities={ENTITIES} />
</DataGrid>;
```

| Prop | Type | Default |
|------|------|---------|
| `entities` | `DataGridFilterEntity[]` | required; keep the array referentially stable (module scope, or `useMemo`) |
| `isAllFiltersOptionVisible` | `boolean` | `true`; the "All filters" chip is drawn when this is on and at least one entity has a panel section |

**Entities.** Each factory returns one filter. They share `id`, `filterKey`
(defaults to `id`: the key your `load` reads) and `label`. With no `label`, the
chip is named after the column whose id equals `id`; an entity with neither a
label nor a matching column throws when it renders. `popover` (`{ minInlineSize,
maxInlineSize? }`, in px) sizes the popover of a filter that has one.

| Factory | Value in `load` | Quick filter | Panel section |
|---------|-----------------|--------------|---------------|
| `filterSearch({ id })` | `{ value: string }` | A text box in a popover, applied 1 s after typing stops | no |
| `filterToggle({ id })` | `{ value: true }` | A chip that switches the filter on and off | no |
| `filterCheckboxGroup({ id, options, search?, searchDebounce? })` | `{ value: (string \| number)[] }` | A popover of checkboxes | yes |
| `filterTagGroup({ id, options, mode?, search? })` | `{ value: (string \| number)[] }` | A popover of selectable tags; `mode: 'radio'` allows one | yes |
| `filterTree({ id, tree, treeLabel, filterValue?, search? })` | `{ value: string \| number }` | A popover with a tree of radios | yes |
| `filterDateRange({ id, modelDateFormat? })` | `{ value: { from?: string, to?: string } }` | A popover with a range calendar | yes |

An option is `{ label, value, component? }`; `component` draws the option in
place of its label. The search box of a checkbox group and a tree shows above 5
options (5 nodes), and of a tag group above 10; `search` forces it on or off.
`filterCheckboxGroup` takes a function for `options` when the list is too long
to load up front: it is called with the trimmed search term, once when the list
opens (with an empty string) and again `searchDebounce` ms (default 300) after
each change of the term, and only the latest answer is shown. A failure shows "No
options found".

**Quick filters** apply at once: each change updates the value, stores it and
reloads from page 1. A chip shows a count when its value is a list, a dot when it
holds any other value, and its popover has a Reset button.

**The "All filters" panel** opens a sheet (from the side from 720 px wide, from the
bottom edge below it) with a section for each entity that has one. Its choices
are a draft: nothing loads until **Apply**, which commits all of them at once.
Leaving the panel without Apply (its close button, Escape, a click outside)
discards the draft, and the next opening starts from what is applied. The count tag in a section's
header clears that section of the draft. The chip's count is the number of active
filters that have a section.

The same width decides how a quick filter opens: as a popover beside its chip,
or as a panel from the bottom edge.

**Active values.** A filter is active unless its value is `undefined`, `null`,
`''` or an empty array, so `false` and `0` are values like any other. Inactive
filters are left out of the load context. (The grid's own `hasActiveFilters`,
which the empty state reads, agrees except for one value: it treats `0` as
inactive.)

**Persistence.** All filters are stored under one key, `dataGrid:${name}:filters`,
as `{ [filterKey]: { value } }`. A refresh that resets filters clears them. The
stored value can be edited by the user, so what the controls show is guarded: a
checkbox group or a tag group reads a stored value that is not a list as no
selection, and a date range reads a bound that is not a date in `modelDateFormat`
as unset. The guards change only what the controls show. Every stored value,
whatever its shape, still reaches `load` as long as it is stored (a list filter's
wrongly shaped value, a date range's, a value for a filter that is no longer in
`entities`), so read `filters` defensively there (check `Array.isArray` before
using a list).

**`filterDateRange`.** The bounds are strings in `modelDateFormat`, which takes
[date-fns format tokens](https://date-fns.org/docs/format) and defaults to
`'yyyy-MM-dd'`: `'dd.MM.yyyy'`, not `'DD.MM.YYYY'`. Either bound may be missing
(`{ from }` means "from then on"). The first click on a day starts a range, the
second ends it (in either order), and a click after that starts a new one.

**`filterTree`.** `tree` is a tree structure, made in the same entry:

```tsx
import { filterTree, useDataGridTreeStructure } from '@gears-frontx/ui-kit/data-grid/filters';

const tree = useDataGridTreeStructure({
  items: departments,
  itemKey: 'id', // the default; a function is allowed
  parentKey: 'parent_id', // the default; or `childrenKey` for nested items
  isLeaf: (department) => !department.has_children, // without it every node can be expanded
});

filterTree({ id: 'department', tree, treeLabel: 'name', filterValue: 'code' });
```

`createDataGridTreeStructure` makes the same thing outside a component; either
returns a structure you can fill later with `tree.setItems(items)` or reshape with
`tree.move(...)` (which throws for a move under the node itself or one of its
descendants), and an open filter follows. `treeLabel` is a property name or a
function returning the node's text; search matches on it, keeps the matching
nodes, the path down to each one and the nodes under it, and starts 300 ms after
typing stops. By default `load` receives the id of the chosen node; `filterValue`
(a property name or a function of the item) sends something else, such as a
code, while the id is what is stored. A tree keeps its items' `id` property as
their key: use the default `itemKey`.

The plugin's API (`getPlugin<DataGridFiltersPluginApi>('filters')`) offers
`useState(filterKey)`, `setState`, `removeState`, `useDraftState`,
`setDraftState`, `applyDraftState`, `resetDraftState`, `useActiveCount(filterKeys)`,
`isFilterValueActive` and `useFilterEntities`, for a custom filter or a control
of your own.

### `DataGridEmptyStatePlugin`

Renders your component in place of the built-in empty state, whenever the grid has
no records (it sits outside `main`, so it also renders for an empty grid with no
filters). Read `hasActiveFilters` from `useDataGrid()` inside it to tell "nothing
here yet" from "nothing matched".

```tsx
function UsersEmptyState() {
  const { useStore } = useDataGrid();
  const hasActiveFilters = useStore((s) => s.hasActiveFilters);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{hasActiveFilters ? 'No matching users' : 'No users yet'}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}

<DataGrid name="users" load={loadUsers} columns={columns} implicitFilterKeys={IMPLICIT_KEYS}>
  <DataGridEmptyStatePlugin component={UsersEmptyState} />
</DataGrid>;
```

### `DataGridRowNumberPlugin`

Adds a column before the data with the row's 1-based number, in the monospace face. It
takes no props.

```tsx
import { DataGridPaginationPlugin } from '@gears-frontx/ui-kit/data-grid/pagination';
import { DataGridRowNumberPlugin } from '@gears-frontx/ui-kit/data-grid/row-number';

<DataGrid name="users" load={loadUsers} columns={columns}>
  <DataGridPaginationPlugin defaultLimit={20} />
  <DataGridRowNumberPlugin />
</DataGrid>;
```

The number is `limit * (page - 1) + index + 1`, so with the pagination plugin the second page
of 20 starts at 21; without it the number is the row's position. The column has no header
text, starts at 32px and grows to the widest number on the page.

## Custom plugins

`createDataGridPlugin(name, setup, propsAreEqual?)` returns a component to use as
a child of `DataGrid`. `setup` runs once, when it first mounts, with the plugin
context, and returns the plugin's API; the optional third argument is the
comparison `React.memo` uses for the props.

```tsx
import { createDataGridPlugin, useDataGrid, type DataGridPluginApi } from '@gears-frontx/ui-kit';
import { create } from 'zustand';

interface StatusApi extends DataGridPluginApi {
  useStatus: () => string;
  setStatus: (status: string) => void;
}

function StatusFilter() {
  const grid = useDataGrid();
  const status = grid.getPlugin<StatusApi>('status')!;
  return <Select value={status.useStatus()} onValueChange={status.setStatus} /* ... */ />;
}

export const StatusPlugin = createDataGridPlugin<DataGridItem, 'status', Record<string, never>, StatusApi>(
  'status',
  (context) => {
    const useStore = create(() => ({ status: '' }));
    const persistent = context.registerPersistentState<{ status?: unknown }>('status');

    // Storage is user-editable: narrow what you read.
    const stored = persistent.value?.status;
    if (typeof stored === 'string') useStore.setState({ status: stored });

    context.registerSlot('top-start', { id: 'status', component: StatusFilter });

    context.hook('load:context', () => {
      const { status } = useStore.getState();
      return status ? { filters: { status: { value: status } } } : undefined;
    });

    return {
      useStatus: () => useStore((s) => s.status),
      setStatus(status) {
        useStore.setState({ status });
        persistent.setValue(status ? { status } : undefined);
        context.triggerLoad();
      },
    };
  },
);
```

### The plugin context

| Area | Members |
|------|---------|
| Plugins | `hook(name, handler)`, `getPlugin<Api>(name)` |
| Layout | `registerSlot(name, options)`, `setActiveSlotId(name, id)`, `getActiveSlotId(name)` |
| Table | `registerTableSlot(name, options)` (`subheader`, `footer`, `header-cell-end`), `registerExtraColumn(options)`, `updateExtraColumnWidth` / `Order` / `Sticky`, `registerComponent(name, component)` (override `row`, `header-cell-label`, `body-cell-content` or `content`), `updateColumns`, `updateColumnVisibility`, `updateColumnSticky`, `updateTableLayout`, `updateStickyHeader` |
| Persistent state | `registerPersistentState(key, options?)` |
| Storage | `useStore(selector)` (`visibleRecords`, `rootSections`, `hasActiveFilters`, ...), `createSection`, `clearSections`, `getRecord`, `getItemId`, ... |
| Load | `triggerLoad(config?)`, `refresh(options?)`, `abort()`, `getLoadInstances()`, `useLoadStateStore` |

### Lifecycle hooks

| Hook | When |
|------|------|
| `init`, `destroy` | The grid mounts, and unmounts (release observers, timers and subscriptions here) |
| `load:prepare` | Before a load starts |
| `load:context` | Return a partial `DataGridLoadContext` to merge into this load: `pagination`, `filters`, `order` |
| `load:process` | Return a replacement `DataGridLoadResult` before it is stored |
| `load:store` | After the result is stored; read `instance.processResult.total`. Return `true` to claim the storing |
| `load:success`, `load:error` | The load settled |
| `refresh` | `refresh()` was called; the options say whether filters reset |

### Conventions

- `registerSlot`, `registerTableSlot` and `registerExtraColumn` append: call them
  in `setup`, not in `onPropsChange`, which runs on every props change.
- `onPropsChange(props)` mirrors props into stores. Gate each optional prop with
  `!== undefined` when you collect updates, or the guard is always true.
- Call `triggerLoad()` or `refresh()` from user actions, not from a global store
  `subscribe`, which fires during initialization and adds loads on top of the
  first. `triggerLoad` queues a load; `refresh` aborts the loads already in flight
  before it starts its own, but two `refresh()` calls in the same tick both load
  (see Known limitations).
- Functions that build plugin infrastructure but are not React hooks do not use
  the `use` prefix.
- Do not import from another plugin's internals; share a utility through the
  grid's services.

## Hooks

| Hook | Returns |
|------|---------|
| `useDataGrid<TItem>()` | The grid instance, inside a `DataGrid`: `getPlugin`, `useStore`, `triggerLoad`, `refresh`, `setActiveSlotId`, ... |
| `useDataGridPluginContext<TItem>()` | The plugin context above, for a component that needs it directly |
| `useDataGridRecord<TItem>()` | The record of the row being rendered, inside a cell or row component |
| `useDataGridActiveView()` | The id of the active `main` view |

## CSS customization

Set these on the grid or any ancestor:

| Variable | Default | Description |
|----------|---------|-------------|
| `--data-grid-table-min-inline-size` | `max-content` | Floor for the table's width. Raise it for a narrow pane that starves flexible columns, set it to `0` for a grid that must fit its wrapper. |
| `--data-grid-header-background` | `var(--card)` | Fill of the header cells while `stickyHeader` is on |
| `--data-grid-text-search-inline-size` | `initial` | Width of the search box; a fixed value stops it shifting as the clear button appears |
| `--data-grid-pinned-background` | `var(--card)` | Fill of a pinned column's cells at rest. A pinned cell is painted with its row's own fill over it, so it follows hover and the other row states. Set `var(--background)` for a grid that sits on the page rather than on a card |

The floor is one constraint among several: under `'fixed'` a table whose columns
declare widths cannot shrink below their sum, and under either mode not below the
columns' minimum content widths.

## Accessibility

- The header label of an orderable column is a native `button` named "Change
  sorting of '<column>' column"; Enter and Space sort. There is no `aria-sort`.
- The table's scroll container is a tab stop (it holds `tabIndex=0` so a keyboard
  can scroll it).
- The pager is a `nav` named "Pagination"; the page buttons are named "Go to page
  N" and carry `aria-current="page"` on the current one.
- `aria-busy` is set on the content region while a loader is on screen.
- The order popover's items are menu items without a menu popup, so they take
  focus and Enter and Space, but arrow keys do not move between them.
- A filter chip is a native `button`; the toggle chip does not say whether it is on
  (no `aria-pressed`), only by its look. The text box of a `filterSearch` filter has
  no placeholder and no accessible name, and the search box inside a list filter
  has a placeholder ("Search...") and no accessible name. A tag is a label over a
  native checkbox or radio, so the input carries the state.
- In a tree filter each row holds a radio and the tree moves its own focus: Arrow
  keys move between rows, Right and Left open and close a directory, Home and End
  go to the ends, and Enter toggles a directory. A node is chosen with the mouse,
  or by Tab to its radio and Space.
- The "All filters" panel is a dialog; it is left with its close button (named
  "Close dialog"), Escape or a click outside.
- Strings are English and live in one module; the kit has no i18n layer yet.

## Known limitations

- Data loading has no stale-response guard: `triggerLoad` neither aborts the load
  in flight nor ignores a late result, so when two loads overlap (two quick page
  clicks, a page-size change, a refresh over a page change, two `refresh()` calls
  in the same tick) the older result can replace the newer one. A `load` that
  ignores `signal` is not protected even by the abort `refresh()` sends. `refresh()` also defaults to `resetFilters: true`.
- Changing the page size from a later page fires two loads.
- `abort()` counts as the grid's own abort. Called during the first load, or during
  the refresh the first load waits on, it ends the first load with nothing loaded:
  the grid shows "No results found" and loads nothing more. A superseded
  `refresh()` resolves without its data, so a caller cannot tell it was superseded.
- A failed first load has no retry; a failed refetch has no UI, and when search or
  sort started it, the failure also reaches the host as an unhandled rejection.
- A search still waiting out its debounce when the grid unmounts is flushed: its
  refresh runs after the grid is gone, and its load's `signal` is not aborted.
- The loading overlay blocks the pointer only, not the keyboard.
- No `aria-sort`; Previous and Next drop keyboard focus at the ends of the range.
- Renderer overrides (`registerComponent`) are last registered wins.
- `registerComponent` accepts `'header-cell'` and `'header-group'`, but the header
  always renders its own cell and group components, so those two overrides have no
  effect.
- A column pinned on its own inside a group, or a pinned group with one column
  unpinned, moves in the body but not under the group's header, so the header
  labels sit over the wrong columns. Pin a group as a whole.
- Router persistence shares bare keys across grids and does not follow `popstate`;
  it also drops `history.state` and the `#hash` when it writes the URL, and it does
  not work during server rendering.
- A new `columns` array identity resets user pins and visibility.
- A filter's quick popover is not kept in step with what resets it from outside:
  a tree filter's radio stays checked after its Reset button until the popover is
  opened again, although the filter is cleared.
- `filterTree` reads each item's `id` property for its search and its radios. With
  an `itemKey` other than `id` every radio shows as checked, a click selects
  nothing, and a search hides every node.
- In a tree filter with a search, the arrow keys also step onto the rows the search
  hides. Once the focus is on a hidden row, no row shown is a tab stop, so the
  arrow keys are lost until that row is shown again or another row is clicked;
  each row's radio can still be reached with Tab.
- A key in `filters` that no entity owns any more, and any stored value of the
  wrong shape (see Persistence), still reach `load`.
- There is no plugin unregister.

## Anti-patterns

- Do not define a column's cell component inline in `render`: it is a new
  component each render.
- Do not leave `columns`, `options` or `excludedColumns` as inline literals that
  change identity every render.
- Do not use `camelCase` column ids; they must be snake_case.
- Do not put a key that the user can clear in `implicitFilterKeys`.
- Do not reach into the grid's markup from a consumer stylesheet; use the CSS
  variables above.
- Do not trigger loads from a store `subscribe` in a plugin.
