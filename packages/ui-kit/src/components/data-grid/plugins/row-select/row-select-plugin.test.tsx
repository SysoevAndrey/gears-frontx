import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '../../../../__test-utils__/render-with-user';
import { DataGrid } from '../../data-grid';
import type { DataGridLoadContext, DataGridLoadResult } from '../../data-grid-types';
import { messages } from '../../messages';
import { useDataGrid } from '../../services/core/data-grid-context';
import type { DataGridTableColumn } from '../../services/table/table-types';
import { DataGridPaginationPlugin } from '../pagination/pagination-plugin';
import { DataGridRowClickPlugin } from '../row-click/row-click-plugin';
import { DataGridTextSearchPlugin } from '../text-search/text-search-plugin';
import bannerStyles from './components/data-grid-row-select-banner.module.css';
import { DataGridRowSelectPlugin } from './row-select-plugin';
import type { DataGridRowSelectPluginApi } from './row-select-types';

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(function () {
    return {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
  }),
);

interface TestItem {
  id: number;
  name: string;
  status: string;
}

const testData: TestItem[] = [
  { id: 1, name: 'Alice', status: 'active' },
  { id: 2, name: 'Bob', status: 'active' },
  { id: 3, name: 'Charlie', status: 'disabled' },
  { id: 4, name: 'Diana', status: 'active' },
];

const testColumns: DataGridTableColumn<TestItem>[] = [
  { id: 'name', label: 'Name' },
  { id: 'status', label: 'Status' },
];

function loadData(): Promise<DataGridLoadResult<TestItem>> {
  return Promise.resolve({ results: testData, total: testData.length });
}

// The items of the last `onSelectionChange` call (an index, not `.at`: the root tsconfig's lib is
// ES2020).
function lastSelection(onSelectionChange: ReturnType<typeof vi.fn>) {
  const { calls } = onSelectionChange.mock;
  return calls[calls.length - 1]?.[0];
}

function renderGrid(props: Record<string, unknown> = {}) {
  return render(
    <DataGrid name="test_row_select" load={loadData} columns={testColumns}>
      <DataGridRowSelectPlugin {...props} />
    </DataGrid>,
  );
}

describe('DataGridRowSelectPlugin', () => {
  describe('rendering', () => {
    it('renders checkboxes for each row', async () => {
      renderGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      // 1 header select-all + 4 body checkboxes
      expect(checkboxes).toHaveLength(5);
    });

    it('renders select-all checkbox in header', async () => {
      renderGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeInTheDocument();
    });
  });

  describe('single row selection', () => {
    it('selects a row when checkbox is clicked', async () => {
      const { user } = renderGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // First body checkbox

      expect(checkboxes[1]).toBeChecked();
    });

    it('deselects a row when checkbox is clicked again', async () => {
      const { user } = renderGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      expect(checkboxes[1]).toBeChecked();

      await user.click(checkboxes[1]);
      expect(checkboxes[1]).not.toBeChecked();
    });
  });

  describe('multiple selection', () => {
    it('allows selecting multiple rows', async () => {
      const { user } = renderGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);

      expect(checkboxes[1]).toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });
  });

  describe('single selection mode', () => {
    it('replaces previous selection in single mode', async () => {
      const { user } = renderGrid({ multiple: false });
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      // No header checkbox in single mode
      await user.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();

      await user.click(checkboxes[1]);
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });

    it('hides select-all checkbox in single mode', async () => {
      renderGrid({ multiple: false });
      await screen.findByRole('table');

      // In single mode: no select-all, so only body checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4); // Only body checkboxes
    });
  });

  describe('select all', () => {
    it('selects all rows when select-all is clicked', async () => {
      const { user } = renderGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select-all

      // All body checkboxes should be checked
      for (let i = 1; i < checkboxes.length; i++) {
        expect(checkboxes[i]).toBeChecked();
      }
    });

    it('deselects all rows when select-all is clicked again', async () => {
      const { user } = renderGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select all
      await user.click(checkboxes[0]); // Deselect all

      for (let i = 1; i < checkboxes.length; i++) {
        expect(checkboxes[i]).not.toBeChecked();
      }
    });

    it('shows indeterminate state when some rows are selected', async () => {
      const { user } = renderGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Select first body row

      // Header checkbox should be indeterminate (aria-checked="mixed")
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[0]).toHaveAttribute('aria-checked', 'mixed');
    });
  });

  describe('the select-all checkbox', () => {
    it('is not ticked on a page with no rows', async () => {
      const { user } = render(
        <DataGrid
          name="test_row_select_empty_page"
          load={(context) => {
            const query = String(context.filters?.textSearch?.value ?? '');
            const results = query ? [] : testData;
            return Promise.resolve({ results, total: results.length });
          }}
          columns={testColumns}
        >
          <DataGridTextSearchPlugin placeholder="search" />
          <DataGridRowSelectPlugin />
        </DataGrid>,
      );
      await screen.findByText('Alice');

      await user.type(screen.getByPlaceholderText('search'), 'zzz');
      await waitForElementToBeRemoved(() => screen.queryByText('Alice'));

      const header = screen.getAllByRole('checkbox');
      expect(header).toHaveLength(1);
      expect(header[0]).not.toBeChecked();
      expect(header[0]).toHaveAttribute('aria-checked', 'false');
    });

    it('is ticked once every row it can select is selected, whatever `visible` hides', async () => {
      const { user } = renderGrid({ visible: (item: TestItem) => item.status !== 'disabled' });
      await screen.findByRole('table');

      // Alice, Bob and Diana have a checkbox; Charlie does not.
      await user.click(screen.getAllByRole('checkbox')[0]);

      expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
      expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('visible predicate', () => {
    it('hides checkbox for non-visible items', async () => {
      renderGrid({
        visible: (item: TestItem) => item.status !== 'disabled',
      });
      await screen.findByRole('table');

      // 1 header + 3 visible body checkboxes (Charlie is disabled)
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);
    });

    it('excludes non-visible items from select all', async () => {
      const onSelectionChange = vi.fn();

      const { user } = renderGrid({
        visible: (item: TestItem) => item.status !== 'disabled',
        onSelectionChange,
      });
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select all

      // Should select only 3 items (Alice, Bob, Diana - not Charlie)
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Alice' }),
          expect.objectContaining({ name: 'Bob' }),
          expect.objectContaining({ name: 'Diana' }),
        ]),
        expect.objectContaining({ mode: 'page' }),
      );
      expect(onSelectionChange.mock.calls[0][0]).toHaveLength(3);
    });
  });

  describe('onSelectionChange callback', () => {
    it('fires when a row is selected', async () => {
      const onSelectionChange = vi.fn();
      const { user } = renderGrid({ onSelectionChange });
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      expect(onSelectionChange).toHaveBeenCalledWith(
        [expect.objectContaining({ name: 'Alice' })],
        expect.objectContaining({ mode: 'page', count: 1 }),
      );
    });

    it('fires with empty array when selection is cleared', async () => {
      const onSelectionChange = vi.fn();
      const { user } = renderGrid({ onSelectionChange });
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Select
      await user.click(checkboxes[1]); // Deselect

      expect(onSelectionChange).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ mode: 'none', count: 0 }),
      );
    });
  });

  describe('showSelectAll', () => {
    it('hides select-all checkbox when showSelectAll is false', async () => {
      renderGrid({ showSelectAll: false });
      await screen.findByRole('table');

      // Only body checkboxes, no header select-all
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);
    });
  });

  describe('select all matching', () => {
    // The pagination plugin persists page/limit to localStorage keyed by grid
    // name; clear it so page state does not leak between tests.
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    const pagedData: TestItem[] = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      name: `Row ${index + 1}`,
      status: 'active',
    }));

    function loadPaged(context: DataGridLoadContext): Promise<DataGridLoadResult<TestItem>> {
      const page = context.pagination?.page ?? 1;
      const limit = context.pagination?.limit ?? 5;
      const start = (page - 1) * limit;
      return Promise.resolve({
        results: pagedData.slice(start, start + limit),
        total: pagedData.length,
      });
    }

    let capturedApi: DataGridRowSelectPluginApi<TestItem> | null = null;

    function CaptureActions({ rowSelect }: { rowSelect: DataGridRowSelectPluginApi<TestItem> }) {
      capturedApi = rowSelect;
      const mode = rowSelect.useSelectionMode();
      const count = rowSelect.useSelectionCount();
      return (
        <>
          <span role="status" aria-label="Selection mode">
            {mode}
          </span>
          <span role="status" aria-label="Selection count">
            {count}
          </span>
        </>
      );
    }

    function renderPagedGrid(props: Record<string, unknown> = {}, limit = 5) {
      capturedApi = null;
      const grid = (
        <DataGrid name="test_row_select_matching" load={loadPaged} columns={testColumns}>
          <DataGridPaginationPlugin defaultLimit={limit} />
          <DataGridRowSelectPlugin<TestItem>
            component={CaptureActions}
            showSelectAllMatching
            {...props}
          />
        </DataGrid>
      );

      return render(grid);
    }

    it('shows no select-all-matching banner until the page is fully selected', async () => {
      const { user } = renderPagedGrid();
      await screen.findByRole('table');

      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // one row only

      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();
    });

    it('offers the banner when the page is full and the total exceeds the page', async () => {
      // The matching total is what the offer is for, and it reaches the reader only as the
      // substituted half of the button's name -- which the key-rendering service `test/unit.tsx`
      // installs drops. The test that claims the offer is the one that has to substitute.
            const { user } = renderPagedGrid({}, 5);
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // select the whole page

      // The offer is a sentence with its action at the end, and the action is a button.
      expect(screen.getByText(messages.rowSelect.pageSelected(5))).toBeInTheDocument();
      const offer = screen.getByRole('button', { name: messages.rowSelect.selectAll(20) });
      expect(offer.tagName).toBe('BUTTON');
      expect(offer).toHaveAttribute('type', 'button');
      // The native button's own look is reset, so it reads as part of the sentence.
      expect(offer.className).toContain(bannerStyles.action);
    });

    it('hides the banner when the total fits a single page', async () => {
      const { user } = renderPagedGrid({}, 20); // all 20 rows fit on one page
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();
    });

    it('hides the banner when showSelectAllMatching is false', async () => {
      const { user } = renderPagedGrid({ showSelectAllMatching: false });
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();
    });

    it('does not offer select-all by default (opt-in)', async () => {
      const { user } = render(
        <DataGrid name="test_row_select_default_optin" load={loadPaged} columns={testColumns}>
          <DataGridPaginationPlugin defaultLimit={5} />
          <DataGridRowSelectPlugin<TestItem> component={CaptureActions} />
        </DataGrid>,
      );
      await screen.findByRole('table');

      await user.click(screen.getAllByRole('checkbox')[0]); // whole page selected
      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();
    });

    it('enters all-matching mode with the total count from the banner', async () => {
      const { user } = renderPagedGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(
        screen.getByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      );

      // Banner switches to the all-selected state
      expect(
        screen.getByRole('button', { name: messages.rowSelect.clearSelection }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();

      // Mode + count reflect all-matching, and the banner says it is the whole match, not the page
      expect(screen.getByRole('status', { name: 'Selection mode' })).toHaveTextContent('all');
      expect(screen.getByRole('status', { name: 'Selection count' })).toHaveTextContent('20');
      expect(screen.getByText(messages.rowSelect.allSelected(20))).toBeInTheDocument();
      expect(capturedApi?.getSelectionDescriptor()).toEqual({ mode: 'all-matching' });
    });

    it('exits all-matching when a single row is deselected', async () => {
      const { user } = renderPagedGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(
        screen.getByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      );

      // Deselect one row
      await user.click(checkboxes[1]);

      expect(screen.getByRole('status', { name: 'Selection mode' })).toHaveTextContent('page');
      expect(screen.getByRole('status', { name: 'Selection count' })).toHaveTextContent('4');
      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: messages.rowSelect.clearSelection }),
      ).not.toBeInTheDocument();
    });

    it('clears the selection (page-scoped) when navigating to another page', async () => {
      const { user } = renderPagedGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(
        screen.getByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      );

      // Go to the next page — selection is page-scoped and starts fresh
      await user.click(screen.getByRole('button', { name: messages.pagination.nextPage }));
      await screen.findByText('Row 6'); // page 2 loaded

      // All-matching left; no banner, no action bar, and no row is selected
      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: messages.rowSelect.clearSelection }),
      ).not.toBeInTheDocument();
      expect(capturedApi?.getSelectionDescriptor()).toEqual({ mode: 'ids', ids: [] });

      const pageTwoCheckboxes = screen.getAllByRole('checkbox');
      pageTwoCheckboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());
    });

    it('clears all-matching from the banner clear action', async () => {
      const { user } = renderPagedGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(
        screen.getByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      );
      await user.click(
        screen.getByRole('button', { name: messages.rowSelect.clearSelection }),
      );

      expect(capturedApi?.getSelectionDescriptor()).toEqual({ mode: 'ids', ids: [] });
    });

    it('returns an ids descriptor in page mode', async () => {
      const { user } = renderPagedGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // select Row 1 (id 1)

      expect(capturedApi?.getSelectionDescriptor()).toEqual({ mode: 'ids', ids: [1] });
    });

    it('passes selection meta to onSelectionChange', async () => {
      const onSelectionChange = vi.fn();
      const { user } = renderPagedGrid({ onSelectionChange });
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // select page
      expect(onSelectionChange).toHaveBeenLastCalledWith(
        expect.any(Array),
        expect.objectContaining({ mode: 'page', count: 5 }),
      );

      await user.click(
        screen.getByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      );
      expect(onSelectionChange).toHaveBeenLastCalledWith(
        expect.any(Array),
        expect.objectContaining({ mode: 'all', count: 20 }),
      );
    });

    it('does not keep a stale total when a later load omits total', async () => {
      // Page 1 reports total 20; page 2 omits total entirely.
      function loadStaleTotal(context: DataGridLoadContext): Promise<DataGridLoadResult<TestItem>> {
        const page = context.pagination?.page ?? 1;
        const limit = context.pagination?.limit ?? 5;
        const start = (page - 1) * limit;
        const results = pagedData.slice(start, start + limit);
        return Promise.resolve(page === 1 ? { results, total: pagedData.length } : { results });
      }

      const { user } = render(
        <DataGrid name="test_row_select_stale_total" load={loadStaleTotal} columns={testColumns}>
          <DataGridPaginationPlugin defaultLimit={5} />
          <DataGridRowSelectPlugin<TestItem> component={CaptureActions} showSelectAllMatching />
        </DataGrid>,
      );
      await screen.findByRole('table');

      await user.click(screen.getAllByRole('checkbox')[0]); // page 1: total 20 > 5
      expect(
        screen.getByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: messages.pagination.nextPage }));
      await screen.findByText('Row 6');
      await user.click(screen.getAllByRole('checkbox')[0]); // select page 2

      // total was reset (page 2 omitted it) → no stale "Select all 20" offer
      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();
    });

    it('does not offer select-all when all matching rows fit one page under a visible predicate', async () => {
      const { user } = render(
        <DataGrid name="test_row_select_visible_onepage" load={loadPaged} columns={testColumns}>
          <DataGridPaginationPlugin defaultLimit={20} />
          <DataGridRowSelectPlugin<TestItem>
            component={CaptureActions}
            showSelectAllMatching
            visible={(item) => item.id % 2 === 1}
          />
        </DataGrid>,
      );
      await screen.findByRole('table');

      // All 20 rows are on one page; ~10 are selectable. Selecting them all must
      // NOT offer "select all" — the total (20) does not exceed the loaded page.
      await user.click(screen.getAllByRole('checkbox')[0]);
      expect(
        screen.queryByRole('button', {
          name: messages.rowSelect.selectAll(20),
        }),
      ).not.toBeInTheDocument();
    });

    it('offers no banner in single-selection mode, even when the one row is the whole page', async () => {
      // One row per page, so selecting it is a full page of a larger match: the case where
      // multiple selection offers "Select all".
      const { user } = renderPagedGrid({ multiple: false }, 1);
      await screen.findByRole('table');

      await user.click(screen.getAllByRole('checkbox')[0]);

      expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
      expect(
        screen.queryByRole('button', { name: messages.rowSelect.selectAll(20) }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(messages.rowSelect.pageSelected(1))).not.toBeInTheDocument();
    });

    it('ignores selectAllMatching in single-selection mode', async () => {
      const { user } = renderPagedGrid({ multiple: false });
      await screen.findByRole('table');

      await user.click(screen.getAllByRole('checkbox')[0]); // no header in single mode → first body row
      capturedApi?.selectAllMatching();

      expect(capturedApi?.getSelectionDescriptor().mode).toBe('ids');
    });
  });

  describe('action bar', () => {
    function ActionComponent({ rowSelect }: { rowSelect: DataGridRowSelectPluginApi }) {
      return (
        <button type="button" onClick={() => rowSelect.clearSelection()}>
          Clear
        </button>
      );
    }

    it('shows action bar when rows are selected', async () => {
      const { user } = renderGrid({
        component: ActionComponent,
      });
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('hides action bar when selection is cleared via clearSelection', async () => {
      const onSelectionChange = vi.fn();
      const { user } = renderGrid({
        component: ActionComponent,
        onSelectionChange,
      });
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      expect(onSelectionChange).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ mode: 'none' }),
      );
      expect(checkboxes[1]).not.toBeChecked();
    });
  });

  describe('keepHiddenSelection', () => {
    // A grid whose load narrows to rows matching the text-search value, so a
    // search can hide an already-selected row.
    function loadFiltered(context: DataGridLoadContext): Promise<DataGridLoadResult<TestItem>> {
      const query = String(context.filters?.textSearch?.value ?? '').toLowerCase();
      const results = query
        ? testData.filter((item) => item.name.toLowerCase().includes(query))
        : testData;
      return Promise.resolve({ results, total: results.length });
    }

    // The plugin's API, for what the DOM does not show. (An action bar would take the search
    // field's place once a row is selected, so the grid has none.)
    let keptApi: DataGridRowSelectPluginApi | undefined;
    function ApiProbe() {
      keptApi = useDataGrid().getPlugin<DataGridRowSelectPluginApi>('rowSelect');
      return null;
    }

    // Distinct grid name per test — grid state is keyed by name, so sharing one
    // would leak the previous test's search value into the next.
    function renderSearchableGrid(name: string, props: Record<string, unknown>) {
      return render(
        <DataGrid name={name} load={loadFiltered} columns={testColumns}>
          <DataGridTextSearchPlugin placeholder="search" />
          <DataGridRowSelectPlugin {...props} />
          <ApiProbe />
        </DataGrid>,
      );
    }

    it('keeps a row selected after it is searched away, then adds to it', async () => {
      const onSelectionChange = vi.fn();
      const { user } = renderSearchableGrid('test_keep_hidden_on', {
        keepHiddenSelection: true,
        onSelectionChange,
      });
      await screen.findByText('Alice');

      // Select Alice.
      await user.click(screen.getAllByRole('checkbox')[1]);
      expect(lastSelection(onSelectionChange)).toEqual([
        expect.objectContaining({ name: 'Alice' }),
      ]);

      // Search "Bob" — Alice is no longer visible.
      await user.type(screen.getByPlaceholderText('search'), 'Bob');
      await waitForElementToBeRemoved(() => screen.queryByText('Alice'));

      // Select the now-only visible row (Bob).
      await user.click(screen.getAllByRole('checkbox')[1]);

      // Alice survived the search and Bob was added.
      const reported = lastSelection(onSelectionChange);
      expect(reported).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Alice' }),
          expect.objectContaining({ name: 'Bob' }),
        ]),
      );
      expect(reported).toHaveLength(2);
    });

    it('keeps the id of a searched-away row, not just the item it reports', async () => {
      const { user } = renderSearchableGrid('test_keep_hidden_ids', { keepHiddenSelection: true });
      await screen.findByText('Alice');

      await user.click(screen.getAllByRole('checkbox')[1]); // Alice, id 1
      await user.type(screen.getByPlaceholderText('search'), 'Bob');
      await waitForElementToBeRemoved(() => screen.queryByText('Alice'));

      expect(keptApi?.getSelectionDescriptor()).toEqual({ mode: 'ids', ids: [1] });
    });

    it('adds the page to the kept selection on select-all, instead of replacing it', async () => {
      const onSelectionChange = vi.fn();
      const { user } = renderSearchableGrid('test_keep_hidden_all', {
        keepHiddenSelection: true,
        onSelectionChange,
      });
      await screen.findByText('Alice');
      await user.click(screen.getAllByRole('checkbox')[1]); // Alice, id 1
      await user.type(screen.getByPlaceholderText('search'), 'Bob');
      await waitForElementToBeRemoved(() => screen.queryByText('Alice'));

      // The header checkbox speaks for the page, which holds only Bob.
      await user.click(screen.getAllByRole('checkbox')[0]);

      expect(keptApi?.getSelectionDescriptor()).toEqual({ mode: 'ids', ids: [1, 2] });
      expect(lastSelection(onSelectionChange)).toHaveLength(2);
    });

    it('drops a searched-away row when keepHiddenSelection is off (default)', async () => {
      const onSelectionChange = vi.fn();
      const { user } = renderSearchableGrid('test_keep_hidden_off', { onSelectionChange });
      await screen.findByText('Alice');

      await user.click(screen.getAllByRole('checkbox')[1]); // Alice
      await user.type(screen.getByPlaceholderText('search'), 'Bob');
      await waitForElementToBeRemoved(() => screen.queryByText('Alice'));

      await user.click(screen.getAllByRole('checkbox')[1]); // Bob

      // Alice was pruned when she left the page; only Bob remains.
      expect(lastSelection(onSelectionChange)).toEqual([
        expect.objectContaining({ name: 'Bob' }),
      ]);
    });
  });

  describe('row click suppression', () => {
    function renderClickableGrid(rowSelectProps: Record<string, unknown> = {}) {
      const click = vi.fn();
      const result = render(
        <DataGrid name="test_row_select_row_click" load={loadData} columns={testColumns}>
          <DataGridRowClickPlugin<TestItem> click={click} />
          <DataGridRowSelectPlugin {...rowSelectProps} />
        </DataGrid>,
      );
      return { ...result, click };
    }

    it('does not fire the row click when a body checkbox is toggled', async () => {
      const { user, click } = renderClickableGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // first body checkbox

      expect(checkboxes[1]).toBeChecked();
      expect(click).not.toHaveBeenCalled();
    });

    it('does not fire the row click when the header select-all is toggled', async () => {
      const { user, click } = renderClickableGrid();
      await screen.findByRole('table');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // header select-all

      expect(click).not.toHaveBeenCalled();
    });

    it('still fires the row click when a data cell is clicked', async () => {
      const { user, click } = renderClickableGrid();
      await screen.findByRole('table');

      await user.click(screen.getByText('Alice'));

      expect(click).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alice' }));
    });
  });

  describe('statusComponent', () => {
    function StatusComponent({ rowSelect }: { rowSelect: DataGridRowSelectPluginApi }) {
      const count = rowSelect.useSelectionCount();
      return (
        <span role="status" aria-label="Selection status">
          {`Custom status: ${count}`}
        </span>
      );
    }

    const getStatus = () => screen.getByRole('status', { name: 'Selection status' });
    const queryStatus = () => screen.queryByRole('status', { name: 'Selection status' });

    function ActionComponent({ rowSelect }: { rowSelect: DataGridRowSelectPluginApi }) {
      return (
        <button type="button" onClick={() => rowSelect.clearSelection()}>
          Clear
        </button>
      );
    }

    it('renders the custom status instead of the default count when rows are selected', async () => {
      const { user } = renderGrid({ statusComponent: StatusComponent });
      await screen.findByRole('table');

      await user.click(screen.getAllByRole('checkbox')[1]);

      expect(getStatus()).toHaveTextContent('Custom status: 1');
      expect(screen.queryByText(messages.rowSelect.itemsSelected(1))).not.toBeInTheDocument();
    });

    it('registers the top slot with statusComponent alone (no action component)', async () => {
      const { user } = renderGrid({ statusComponent: StatusComponent });
      await screen.findByRole('table');

      expect(queryStatus()).not.toBeInTheDocument();

      await user.click(screen.getAllByRole('checkbox')[1]);

      expect(getStatus()).toBeInTheDocument();
    });

    it('renders both the action component and the custom status', async () => {
      const { user } = renderGrid({
        component: ActionComponent,
        statusComponent: StatusComponent,
      });
      await screen.findByRole('table');

      await user.click(screen.getAllByRole('checkbox')[1]);

      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(getStatus()).toHaveTextContent('Custom status: 1');
    });

    it('shows the default count (no custom status) when no statusComponent is provided', async () => {
      const { user } = renderGrid({ component: ActionComponent });
      await screen.findByRole('table');

      await user.click(screen.getAllByRole('checkbox')[1]);

      // The action bar is shown, with the default count in place of the custom status.
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(queryStatus()).not.toBeInTheDocument();
      expect(screen.getByText(messages.rowSelect.itemsSelected(1))).toBeInTheDocument();
    });
  });
});
