/*
 * Every user-facing string the grid renders, in one place. The kit has no i18n layer, so these are
 * English literals; one module keeps them findable and lets the tests assert against `messages.*`
 * instead of repeating the text. A string that embeds a count or a name is a function of it.
 */
export const messages = {
  emptyState: {
    noResultsFound: 'No results found',
    noResultsFoundDescription: 'Try adjusting your search or filters',
  },
  loadError: {
    headerDefault: 'Something went wrong',
    bodyDefault: 'An error occurred while loading',
  },
  layoutMainSlotSelector: {
    table: 'Table view',
    cards: 'Cards view',
  },
  textSearch: {
    placeholder: 'Search...',
    clear: 'Clear input',
  },
  order: {
    sort: 'Sort',
    sortBy: 'Sort by',
    order: 'Order',
    changeSorting: (columnLabel: string) => `Change sorting of '${columnLabel}' column`,
    ascString: 'A-Z',
    descString: 'Z-A',
    ascNumber: '0-9',
    descNumber: '9-0',
    ascDate: 'Oldest first',
    descDate: 'Newest first',
  },
  actionsMenu: {
    actions: 'Actions',
  },
  tableConfiguration: {
    header: 'Table configuration',
    configureColumns: 'Configure columns',
    pinColumn: 'Pin column',
    unpinColumn: 'Unpin column',
  },
  rowSelect: {
    itemsSelected: (count: number) => (count === 1 ? '1 item selected' : `${count} items selected`),
    pageSelected: (count: number) =>
      count === 1 ? '1 item on this page is selected.' : `All ${count} items on this page are selected.`,
    selectAll: (count: number) => `Select all ${count}`,
    allSelected: (count: number) =>
      count === 1 ? '1 item is selected.' : `All ${count} items are selected.`,
    clearSelection: 'Clear selection',
  },
  pagination: {
    ariaLabel: 'Pagination',
    // The pager of a grid with a `label`: two grids on one page must not share the landmark name
    // "Pagination" (axe's `landmark-unique`), so the label names each one's nav.
    ariaLabelFor: (label: string) => `${label} pagination`,
    limitSelectorAriaLabel: 'Items per page',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    goToPage: (page: number) => `Go to page ${page}`,
    pageInfo: (page: number, totalPages: number, total: number) =>
      `Page ${page} of ${totalPages} (${total} items)`,
  },
  filters: {
    allFilters: 'All filters',
    allFiltersTitle: 'All filters',
    apply: 'Apply',
    reset: 'Reset',
    searchPlaceholder: 'Search...',
    noOptionsFound: 'No options found',
    close: 'Close',
    closeDialog: 'Close dialog',
  },
  dragDrop: {
    dragHandle: 'Drag to reorder row',
  },
  tree: {
    noItems: 'No items',
    collapse: 'Collapse',
    expand: 'Expand',
  },
};
