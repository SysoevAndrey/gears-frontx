# Pagination

Page-number navigation built from real anchors, with button twins of the
same parts for paging held in state. No Base UI primitive backs it: pure
styling over semantic markup (`nav` > `ul` > `li`), the same shape as
`Table`/`Breadcrumb`.

An item is a 28px square at a 6px radius, transparent, with a centred 12/16
label in `--muted-foreground` and a 4px gap between items. The active page
inverts: the page's own `--background` becomes the chip fill, under a
`--primary` label. `PaginationPrevious`/`PaginationNext` take the same 28px
height with horizontal padding instead of a fixed square, because they carry
an icon and a label side by side.

## When to use

- Navigating between server-rendered pages of a result set, where each page
  is a real URL (`<PaginationLink href="?page=2">`).
- Paging a list held in component state, where changing the page is a state
  update and leaves the URL alone (`<PaginationButton onClick={...}>`).

## When not to use

- Client-side "load more"/infinite scroll — use a plain `Button`.
- A single prev/next stepper with no page numbers — `PaginationPrevious`/
  `PaginationNext` alone (skip `PaginationLink`) already cover that.

## Parts

| Part | Renders | Notes |
|------|---------|-------|
| `Pagination` | `<nav aria-label="pagination">` | The root landmark |
| `PaginationContent` | `<ul>` | Row of page items |
| `PaginationItem` | `<li>` | One item |
| `PaginationLink` | `<a>` | A page number; square by default |
| `PaginationPrevious` | `<a>` | Chevron + "Previous" (hidden below 640px) |
| `PaginationNext` | `<a>` | "Next" + chevron (hidden below 640px) |
| `PaginationButton` | `<button type="button">` | A page number for state-driven paging; the button twin of `PaginationLink` |
| `PaginationPreviousButton` | `<button type="button">` | The button twin of `PaginationPrevious`; `disabled` at the first page |
| `PaginationNextButton` | `<button type="button">` | The button twin of `PaginationNext`; `disabled` at the last page |
| `PaginationEllipsis` | `<span>` | Collapsed-pages indicator |

## Props (kit level)

`PaginationLink`:

| Prop | Type | Default |
|------|------|---------|
| `isActive` | `boolean` - inverts the item's paint and sets `aria-current="page"` | `false` |
| `square` | `boolean` - a 28px square footprint instead of a padded one | `true` |

`PaginationPrevious`/`PaginationNext` accept the same props minus `square`
(fixed to `false`), plus `text` to relabel the link.

`PaginationButton` takes the same `isActive` and `square`, and every native
button prop (`onClick`, `disabled`, ...); `type` defaults to `"button"`, so
it never submits a form it sits in. `PaginationPreviousButton` /
`PaginationNextButton` mirror `PaginationPrevious` / `PaginationNext`: no
`square`, no `isActive`, and `text` to relabel them. A disabled button is
dimmed and leaves the tab order, which is how a pager marks the ends of its
range.

The Previous / Next chevrons mirror under a right-to-left direction, on the
anchor and the button forms alike.

## Implementation note

Pagination carries its own geometry rather than a `Button` size: the drawn
item is 28px with a paint inversion on the active page that no Button
variant renders. The link parts are real `<a>` elements, so pagination items
stay crawlable and cmd-clickable; the button parts paint identically but are
native `<button>`s, because `PaginationLink` always renders an anchor (it has
no `render` prop). Pick by what a page change is: a navigation to a URL is a
link, a state update is a button.

## Examples

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@gears-frontx/ui-kit';

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="?page=1" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="?page=1">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="?page=2" isActive>
        2
      </PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationEllipsis />
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="?page=3" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

A state-driven pager, with the ends of the range disabled:

```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPreviousButton disabled={page === 1} onClick={() => setPage(page - 1)} />
    </PaginationItem>
    {pages.map((n) => (
      <PaginationItem key={n}>
        <PaginationButton isActive={n === page} onClick={() => setPage(n)}>
          {n}
        </PaginationButton>
      </PaginationItem>
    ))}
    <PaginationItem>
      <PaginationNextButton disabled={page === pages.length} onClick={() => setPage(page + 1)} />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

## Anti-patterns

- Do not wrap a client-side handler in `href="#"` and call
  `preventDefault()` as the only navigation mechanism — a real `href` keeps
  the page crawlable and cmd/middle-click-able, matching a genuine link's
  semantics.
- Do not use `PaginationButton` for a page that has its own URL — it cannot
  be opened in a new tab or crawled; use `PaginationLink` with the real
  `href`.
- Do not set `isActive` on more than one `PaginationLink` at a time — only
  one page is "current".
