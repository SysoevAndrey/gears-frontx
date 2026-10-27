import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../../../../__test-utils__/render-with-user';
import { DataGrid } from '../../data-grid';
import type { DataGridLoadContext, DataGridLoadResult } from '../../data-grid-types';
import { messages } from '../../messages';
import { useDataGrid } from '../../services/core/data-grid-context';
import type { DataGridTableColumn } from '../../services/table/table-types';
import { filterCheckboxGroup } from './entities/checkbox-group/filter-checkbox-group';
import { filterSearch } from './entities/search/filter-search';
import { filterTagGroup } from './entities/tag-group/filter-tag-group';
import { filterToggle } from './entities/toggle/filter-toggle';
import { DataGridFiltersPlugin } from './filters-plugin';
import type { DataGridFiltersPluginApi } from './filters-types';

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
  active: boolean;
}

const testData: TestItem[] = [
  { id: 1, name: 'Alice', status: 'published', active: true },
  { id: 2, name: 'Bob', status: 'draft', active: false },
  { id: 3, name: 'Charlie', status: 'published', active: true },
  { id: 4, name: 'Dave', status: 'archived', active: false },
];

const testColumns: DataGridTableColumn<TestItem>[] = [
  { id: 'name', label: 'Name' },
  { id: 'status', label: 'Status' },
];

const statusOptions = [
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

const filterEntities = [
  filterToggle({ id: 'onlyActive', label: 'Only active' }),
  filterCheckboxGroup({ id: 'status', label: 'Status', options: statusOptions }),
];

function createLoadFn(data: TestItem[]) {
  const loadFn = vi.fn((context: DataGridLoadContext): Promise<DataGridLoadResult<TestItem>> => {
    let filtered = [...data];
    const { filters } = context;

    if (filters?.onlyActive?.value === true) {
      filtered = filtered.filter((item) => item.active);
    }
    if (
      filters?.status?.value &&
      Array.isArray(filters.status.value) &&
      filters.status.value.length > 0
    ) {
      filtered = filtered.filter((item) =>
        (filters.status.value as string[]).includes(item.status),
      );
    }

    return Promise.resolve({ results: filtered, total: filtered.length });
  });

  return loadFn;
}

// Helper component that exposes isFilterValueActive results for direct testing
function IsActiveProbe() {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;
  const { isFilterValueActive } = filtersApi;

  return (
    <dl aria-label="Filter active states">
      <dt>undefined</dt>
      <dd>{String(isFilterValueActive(undefined))}</dd>
      <dt>null</dt>
      <dd>{String(isFilterValueActive(null))}</dd>
      <dt>false</dt>
      <dd>{String(isFilterValueActive(false))}</dd>
      <dt>empty-string</dt>
      <dd>{String(isFilterValueActive(''))}</dd>
      <dt>empty-array</dt>
      <dd>{String(isFilterValueActive([]))}</dd>
      <dt>true</dt>
      <dd>{String(isFilterValueActive(true))}</dd>
      <dt>string</dt>
      <dd>{String(isFilterValueActive('search'))}</dd>
      <dt>number</dt>
      <dd>{String(isFilterValueActive(42))}</dd>
      <dt>array</dt>
      <dd>{String(isFilterValueActive(['a']))}</dd>
    </dl>
  );
}

// Helper component that captures filters API and exposes actions as buttons
function FilterActions() {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  return (
    <>
      <button type="button" onClick={() => filtersApi.setState('status', { value: ['published'] })}>
        Set Published
      </button>
      <button type="button" onClick={() => filtersApi.setState('onlyActive', { value: true })}>
        Set Active
      </button>
      <button type="button" onClick={() => filtersApi.removeState('status')}>
        Remove Status
      </button>
      <button type="button" onClick={() => grid.refresh({ resetFilters: true })}>
        Reset Filters
      </button>
      <button type="button" onClick={() => grid.refresh({ resetFilters: false })}>
        Refresh Keep
      </button>
      <button
        type="button"
        onClick={() => filtersApi.setDraftState('status', { value: ['archived'] })}
      >
        Set Draft
      </button>
      <button type="button" onClick={() => filtersApi.applyDraftState()}>
        Apply Draft
      </button>
      <button type="button" onClick={() => filtersApi.resetDraftState()}>
        Reset Draft
      </button>
    </>
  );
}

function renderGrid(loadFn?: ReturnType<typeof createLoadFn>) {
  const load = loadFn ?? createLoadFn(testData);

  const result = render(
    <DataGrid
      name={`test_filters_grid_${Date.now()}_${Math.random()}`}
      load={load}
      columns={testColumns}
    >
      <DataGridFiltersPlugin entities={filterEntities} />
      <FilterActions />
      <IsActiveProbe />
    </DataGrid>,
  );

  return { load, ...result };
}

describe('filter entity factories', () => {
  describe('filterSearch', () => {
    it('creates a search filter entity with defaults', () => {
      const entity = filterSearch({ id: 'query', label: 'Search' });

      expect(entity.id).toBe('query');
      expect(entity.filterKey).toBe('query');
      expect(entity.label).toBe('Search');
      expect(entity.filterComponent).toBeDefined();
      expect(entity.dialogFilterComponent).toBeUndefined();
    });

    it('uses custom filterKey when provided', () => {
      const entity = filterSearch({ id: 'query', filterKey: 'search_term' });

      expect(entity.filterKey).toBe('search_term');
    });
  });

  describe('filterToggle', () => {
    it('creates a toggle filter entity with defaults', () => {
      const entity = filterToggle({ id: 'active', label: 'Active only' });

      expect(entity.id).toBe('active');
      expect(entity.filterKey).toBe('active');
      expect(entity.label).toBe('Active only');
      expect(entity.filterComponent).toBeDefined();
      expect(entity.dialogFilterComponent).toBeUndefined();
    });

    it('uses custom filterKey when provided', () => {
      const entity = filterToggle({ id: 'active', filterKey: 'is_active' });

      expect(entity.filterKey).toBe('is_active');
    });
  });

  describe('filterCheckboxGroup', () => {
    const options = [
      { label: 'Published', value: 'published' },
      { label: 'Draft', value: 'draft' },
    ];

    it('creates a checkbox group filter entity with defaults', () => {
      const entity = filterCheckboxGroup({ id: 'status', options });

      expect(entity.id).toBe('status');
      expect(entity.filterKey).toBe('status');
      expect(entity.filterComponent).toBeDefined();
      expect(entity.dialogFilterComponent).toBeDefined();
      expect(entity.params.options).toBe(options);
    });

    it('auto-enables search when options exceed threshold', () => {
      const manyOptions = Array.from({ length: 10 }, (_, i) => ({
        label: `Option ${i}`,
        value: `opt_${i}`,
      }));
      const entity = filterCheckboxGroup({ id: 'many', options: manyOptions });

      expect(entity.params.search).toBe(true);
    });

    it('disables search for few options by default', () => {
      const entity = filterCheckboxGroup({ id: 'status', options });

      expect(entity.params.search).toBe(false);
    });

    it('respects explicit search override', () => {
      const entity = filterCheckboxGroup({ id: 'status', options, search: true });

      expect(entity.params.search).toBe(true);
    });

    it('passes popover options through', () => {
      const popover = { minInlineSize: 200 };
      const entity = filterCheckboxGroup({ id: 'status', options, popover });

      expect(entity.params.popover).toBe(popover);
    });
  });

  describe('filterTagGroup', () => {
    const options = [
      { label: 'Tag A', value: 'a' },
      { label: 'Tag B', value: 'b' },
    ];

    it('creates a tag group filter entity with defaults', () => {
      const entity = filterTagGroup({ id: 'tags', options });

      expect(entity.id).toBe('tags');
      expect(entity.filterKey).toBe('tags');
      expect(entity.filterComponent).toBeDefined();
      expect(entity.dialogFilterComponent).toBeDefined();
      expect(entity.params.options).toBe(options);
      expect(entity.params.mode).toBe('checkbox');
    });

    it('supports radio mode', () => {
      const entity = filterTagGroup({ id: 'tags', options, mode: 'radio' });

      expect(entity.params.mode).toBe('radio');
    });

    it('auto-enables search when options exceed threshold', () => {
      const manyOptions = Array.from({ length: 15 }, (_, i) => ({
        label: `Tag ${i}`,
        value: `tag_${i}`,
      }));
      const entity = filterTagGroup({ id: 'tags', options: manyOptions });

      expect(entity.params.search).toBe(true);
    });

    it('disables search for few options by default', () => {
      const entity = filterTagGroup({ id: 'tags', options });

      expect(entity.params.search).toBe(false);
    });
  });
});

describe('filters plugin core behavior', () => {
  describe('load:context hook injects filters', () => {
    it('passes active filters to load function', async () => {
      const loadFn = createLoadFn(testData);
      const { user } = renderGrid(loadFn);

      await screen.findByRole('table');
      loadFn.mockClear();

      await user.click(screen.getByRole('button', { name: 'Set Published' }));

      await vi.waitFor(() => expect(loadFn).toHaveBeenCalled());
      const ctx = loadFn.mock.lastCall![0];
      expect(ctx.filters).toEqual({
        status: { value: ['published'] },
      });
    });

    it('excludes inactive filter values from load context', async () => {
      const loadFn = createLoadFn(testData);
      const { user } = renderGrid(loadFn);

      await screen.findByRole('table');

      // Set a filter then remove it
      await user.click(screen.getByRole('button', { name: 'Set Published' }));
      await vi.waitFor(() => expect(loadFn).toHaveBeenCalledTimes(2));

      loadFn.mockClear();
      await user.click(screen.getByRole('button', { name: 'Remove Status' }));

      await vi.waitFor(() => expect(loadFn).toHaveBeenCalled());
      const ctx = loadFn.mock.lastCall![0];
      expect(ctx.filters).toBeUndefined();
    });
  });

  describe('setState and removeState', () => {
    it('filters data when setState is called', async () => {
      const { user } = renderGrid();

      await screen.findByRole('table');
      // Initial: 4 data rows
      expect(screen.getAllByRole('row')).toHaveLength(5); // 1 header + 4

      await user.click(screen.getByRole('button', { name: 'Set Published' }));

      // Should show only published items (Alice, Charlie)
      await screen.findByText('Alice');
      expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header + 2
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      expect(screen.queryByText('Dave')).not.toBeInTheDocument();
    });

    it('restores data when removeState is called', async () => {
      const { user } = renderGrid();

      await screen.findByRole('table');

      await user.click(screen.getByRole('button', { name: 'Set Published' }));
      await vi.waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));

      await user.click(screen.getByRole('button', { name: 'Remove Status' }));
      await vi.waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(5));
    });
  });

  describe('resetFilters clears state', () => {
    it('clears all filters on refresh with resetFilters: true', async () => {
      const { user } = renderGrid();

      await screen.findByRole('table');

      // Apply filters
      await user.click(screen.getByRole('button', { name: 'Set Published' }));
      await vi.waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));

      // Reset
      await user.click(screen.getByRole('button', { name: 'Reset Filters' }));
      await vi.waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(5));
    });

    it('preserves filters on refresh with resetFilters: false', async () => {
      const { user } = renderGrid();

      await screen.findByRole('table');

      await user.click(screen.getByRole('button', { name: 'Set Published' }));
      await vi.waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));

      await user.click(screen.getByRole('button', { name: 'Refresh Keep' }));
      // Should still be filtered
      await vi.waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    });
  });

  describe('isFilterValueActive', () => {
    function getDefinitionValue(term: string) {
      const dl = screen.getByLabelText('Filter active states');
      const dts = dl.querySelectorAll('dt');
      for (const dt of dts) {
        if (dt.textContent === term) {
          return dt.nextElementSibling!;
        }
      }
      throw new Error(`No definition found for "${term}"`);
    }

    it('returns false for inactive values', async () => {
      renderGrid();
      await screen.findByRole('table');

      expect(getDefinitionValue('undefined')).toHaveTextContent('false');
      expect(getDefinitionValue('null')).toHaveTextContent('false');
      expect(getDefinitionValue('empty-string')).toHaveTextContent('false');
      expect(getDefinitionValue('empty-array')).toHaveTextContent('false');
    });

    it('returns true for active values', async () => {
      renderGrid();
      await screen.findByRole('table');

      expect(getDefinitionValue('false')).toHaveTextContent('true');
      expect(getDefinitionValue('true')).toHaveTextContent('true');
      expect(getDefinitionValue('string')).toHaveTextContent('true');
      expect(getDefinitionValue('number')).toHaveTextContent('true');
      expect(getDefinitionValue('array')).toHaveTextContent('true');
    });
  });

  describe('persistent state hydration', () => {
    it('hydrates filters from localStorage on mount', async () => {
      const gridName = `test_hydration_${Date.now()}_${Math.random()}`;
      const storageKey = `dataGrid:${gridName}:filters`;
      const loadFn = createLoadFn(testData);

      // Seed localStorage before rendering
      localStorage.setItem(storageKey, JSON.stringify({ status: { value: ['published'] } }));

      try {
        render(
          <DataGrid name={gridName} load={loadFn} columns={testColumns}>
            <DataGridFiltersPlugin entities={filterEntities} />
          </DataGrid>,
        );

        await screen.findByRole('table');

        // The load function should have been called with hydrated filters
        const ctx = loadFn.mock.lastCall![0];
        expect(ctx.filters).toEqual({
          status: { value: ['published'] },
        });

        // Only published items should be shown
        expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header + 2 published
      } finally {
        localStorage.removeItem(storageKey);
      }
    });
  });

  describe('draft state', () => {
    it('setDraftState does not trigger a load', async () => {
      const loadFn = createLoadFn(testData);
      const { user } = renderGrid(loadFn);

      await screen.findByRole('table');
      const callCount = loadFn.mock.calls.length;

      await user.click(screen.getByRole('button', { name: 'Set Draft' }));

      // No new load triggered
      expect(loadFn.mock.calls.length).toBe(callCount);
    });

    it('applyDraftState applies draft filters and triggers load', async () => {
      const loadFn = createLoadFn(testData);
      const { user } = renderGrid(loadFn);

      await screen.findByRole('table');

      await user.click(screen.getByRole('button', { name: 'Set Draft' }));
      loadFn.mockClear();

      await user.click(screen.getByRole('button', { name: 'Apply Draft' }));

      await vi.waitFor(() => expect(loadFn).toHaveBeenCalled());
      const ctx = loadFn.mock.lastCall![0];
      expect(ctx.filters).toEqual({
        status: { value: ['archived'] },
      });
    });

    it('resetDraftState reverts draft to main state', async () => {
      const loadFn = createLoadFn(testData);
      const { user } = renderGrid(loadFn);

      await screen.findByRole('table');

      // Set main state
      await user.click(screen.getByRole('button', { name: 'Set Published' }));
      await vi.waitFor(() => expect(loadFn).toHaveBeenCalledTimes(2));

      // Set draft to something different, then reset it
      await user.click(screen.getByRole('button', { name: 'Set Draft' }));
      await user.click(screen.getByRole('button', { name: 'Reset Draft' }));

      loadFn.mockClear();
      // Apply the reset draft — should match main state (published)
      await user.click(screen.getByRole('button', { name: 'Apply Draft' }));

      await vi.waitFor(() => expect(loadFn).toHaveBeenCalled());
      const ctx = loadFn.mock.lastCall![0];
      expect(ctx.filters).toEqual({
        status: { value: ['published'] },
      });
    });
  });
});

describe('All Filters dialog section badges', () => {
  async function openDialog(loadFn?: ReturnType<typeof createLoadFn>) {
    const rendered = renderGrid(loadFn);
    await screen.findByRole('table');

    await rendered.user.click(screen.getByRole('button', { name: messages.filters.allFilters }));
    const dialog = await screen.findByRole('dialog');

    return { ...rendered, dialog };
  }

  it('shows no badge while the section draft is empty', async () => {
    const { dialog } = await openDialog();

    expect(
      within(dialog).queryByRole('button', { name: messages.filters.close }),
    ).not.toBeInTheDocument();
  });

  it('shows the selection count and updates as the draft changes', async () => {
    const { user, dialog } = await openDialog();

    // Expand the Status section and select two options.
    await user.click(within(dialog).getByRole('button', { name: 'Status' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Published' }));
    expect(within(dialog).getByText('1')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('checkbox', { name: 'Draft' }));
    expect(within(dialog).getByText('2')).toBeInTheDocument();
  });

  it('clears only the section draft from the badge close button', async () => {
    const loadFn = createLoadFn(testData);
    const { user, dialog } = await openDialog(loadFn);

    await user.click(within(dialog).getByRole('button', { name: 'Status' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Published' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Draft' }));

    loadFn.mockClear();
    await user.click(within(dialog).getByRole('button', { name: messages.filters.close }));

    // Badge disappears, selections reset, and the applied filters are untouched
    // (no reload happens until Apply).
    expect(within(dialog).queryByText('2')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: 'Published' })).not.toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Draft' })).not.toBeChecked();
    expect(loadFn).not.toHaveBeenCalled();

    // Applying the cleared draft sends no status filter.
    await user.click(within(dialog).getByRole('button', { name: messages.filters.apply }));
    await vi.waitFor(() => expect(loadFn).toHaveBeenCalled());
    expect(loadFn.mock.lastCall![0].filters?.status).toBeUndefined();
  });
});
