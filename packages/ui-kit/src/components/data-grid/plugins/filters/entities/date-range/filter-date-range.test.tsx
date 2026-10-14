import { screen, waitFor, within } from '@testing-library/react';
import { format, setDate, subMonths } from 'date-fns';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../../../../../../__test-utils__/render-with-user';
import { DataGrid } from '../../../../data-grid';
import type { DataGridLoadContext, DataGridLoadResult } from '../../../../data-grid-types';
import { messages } from '../../../../messages';
import { useDataGrid } from '../../../../services/core/data-grid-context';
import type { DataGridTableColumn } from '../../../../services/table/table-types';
import { DataGridFiltersPlugin } from '../../filters-plugin';
import type { DataGridFilterDateRangeValue, DataGridFiltersPluginApi } from '../../filters-types';
import { filterDateRange } from './filter-date-range';

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
}

const testColumns: DataGridTableColumn<TestItem>[] = [{ id: 'name', label: 'Name' }];

/**
 * The tests click days of the current month — the month the calendar opens on with
 * no selection. Only mid-month days are used, so they are never rendered as an
 * outside day of a neighbouring month, and their ordinal suffix is always "th".
 */
function dayOfCurrentMonth(day: number): string {
  return format(setDate(new Date(), day), 'yyyy-MM-dd');
}

/** react-day-picker labels each day button "Monday, March 15th, 2026". */
function dayButtonName(day: number): RegExp {
  return new RegExp(`${format(new Date(), 'MMMM')} ${day}th, ${format(new Date(), 'yyyy')}`);
}

function createLoadFn() {
  // The grid is not filtered locally; the tests assert on the load context the
  // callback receives, so the context parameter is declared to be recorded.
  return vi.fn((context: DataGridLoadContext): Promise<DataGridLoadResult<TestItem>> => {
    void context;
    return Promise.resolve({ results: [{ id: 1, name: 'Alice' }], total: 1 });
  });
}

function lastRangeValue(load: ReturnType<typeof createLoadFn>) {
  const context = load.mock.lastCall?.[0];
  const filters = context?.filters;

  return filters?.timeRange?.value as { from?: string; to?: string } | undefined;
}

interface RenderGridOptions {
  withAllFilters?: boolean;
  modelDateFormat?: string;
  /** Seeds the filter state, for values the calendar itself can never produce. */
  initialValue?: DataGridFilterDateRangeValue;
}

/** Writes a starting filter value through the plugin API, as a consumer would. */
function SeedFilterState({ value }: { value: DataGridFilterDateRangeValue }) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  useEffect(() => {
    filtersApi.setState('timeRange', { value });
  }, [filtersApi, value]);

  return null;
}

async function renderGrid({
  withAllFilters = false,
  modelDateFormat,
  initialValue,
}: RenderGridOptions = {}) {
  const load = createLoadFn();
  const entities = [filterDateRange({ id: 'timeRange', label: 'Date range', modelDateFormat })];

  const result = render(
    <DataGrid
      name={`test_date_range_grid_${Date.now()}_${Math.random()}`}
      load={load}
      columns={testColumns}
    >
      <DataGridFiltersPlugin entities={entities} isAllFiltersOptionVisible={withAllFilters} />
      {initialValue && <SeedFilterState value={initialValue} />}
    </DataGrid>,
  );

  await screen.findByRole('table');

  return { load, ...result };
}

async function openChip(options?: Parameters<typeof renderGrid>[0]) {
  const rendered = await renderGrid(options);
  await rendered.user.click(screen.getByRole('button', { name: 'Date range' }));

  return rendered;
}

describe('filterDateRange', () => {
  it('creates a date range filter entity with defaults', () => {
    const entity = filterDateRange({ id: 'timeRange', label: 'Date range' });

    expect(entity.id).toBe('timeRange');
    expect(entity.filterKey).toBe('timeRange');
    expect(entity.label).toBe('Date range');
    expect(entity.filterComponent).toBeDefined();
    expect(entity.dialogFilterComponent).toBeDefined();
  });

  it('uses custom filterKey when provided', () => {
    const entity = filterDateRange({ id: 'timeRange', filterKey: 'period' });

    expect(entity.filterKey).toBe('period');
  });

  it('passes the popover config through without a width default', () => {
    // The calendar carries its own `min-inline-size`, so the entity adds no default
    // of its own — the consumer stays in charge, like every sibling entity.
    expect(filterDateRange({ id: 'timeRange' }).params?.popover).toBeUndefined();
    expect(
      filterDateRange({ id: 'timeRange', popover: { minInlineSize: 320 } }).params?.popover,
    ).toEqual({ minInlineSize: 320 });
  });

  it('commits a start-only range on the first click', async () => {
    const { load, user } = await openChip();

    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));

    expect(lastRangeValue(load)).toEqual({ from: dayOfCurrentMonth(15) });
  });

  it('completes the range on the second click', async () => {
    const { load, user } = await openChip();

    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));
    await user.click(screen.getByRole('button', { name: dayButtonName(20) }));

    expect(lastRangeValue(load)).toEqual({
      from: dayOfCurrentMonth(15),
      to: dayOfCurrentMonth(20),
    });
  });

  it('orders the two days when the later one is clicked first', async () => {
    const { load, user } = await openChip();

    await user.click(screen.getByRole('button', { name: dayButtonName(20) }));
    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));

    expect(lastRangeValue(load)).toEqual({
      from: dayOfCurrentMonth(15),
      to: dayOfCurrentMonth(20),
    });
  });

  it('emits the bounds in a configured modelDateFormat', async () => {
    const { load, user } = await openChip({ modelDateFormat: 'dd.MM.yyyy' });

    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));
    await user.click(screen.getByRole('button', { name: dayButtonName(20) }));

    expect(lastRangeValue(load)).toEqual({
      from: format(setDate(new Date(), 15), 'dd.MM.yyyy'),
      to: format(setDate(new Date(), 20), 'dd.MM.yyyy'),
    });
  });

  it('restarts the range when clicking after a complete range', async () => {
    const { load, user } = await openChip();

    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));
    await user.click(screen.getByRole('button', { name: dayButtonName(20) }));
    await user.click(screen.getByRole('button', { name: dayButtonName(12) }));

    expect(lastRangeValue(load)).toEqual({ from: dayOfCurrentMonth(12) });
  });

  it('restarts a one-day range when the same day is clicked again', async () => {
    const { load, user } = await openChip();

    // Two clicks on one day commit a one-day range; a third must start a new one
    // rather than leave the chip stuck filtering on it. The calendar answers that
    // third click with `undefined`.
    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));
    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));
    await waitFor(() =>
      expect(lastRangeValue(load)).toEqual({
        from: dayOfCurrentMonth(15),
        to: dayOfCurrentMonth(15),
      }),
    );

    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));

    expect(lastRangeValue(load)).toEqual({ from: dayOfCurrentMonth(15) });
  });

  it('starts a fresh range from an end-only value instead of inverting it', async () => {
    // `{ to }` alone is reachable through the plugin API, never through the calendar.
    const { load, user } = await openChip({ initialValue: { to: dayOfCurrentMonth(20) } });

    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));

    expect(lastRangeValue(load)).toEqual({ from: dayOfCurrentMonth(15) });
  });

  it('keeps the popover open through the selection', async () => {
    const { user } = await openChip();

    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));
    await user.click(screen.getByRole('button', { name: dayButtonName(20) }));

    expect(screen.getByRole('button', { name: messages.filters.reset })).toBeInTheDocument();
  });

  it('removes the filter on reset instead of storing an empty range', async () => {
    const { load, user } = await openChip();

    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));
    await user.click(screen.getByRole('button', { name: messages.filters.reset }));

    // The plugin drops the key altogether rather than passing an empty range on.
    expect(lastRangeValue(load)).toBeUndefined();
  });

  it('shows the plain active badge rather than a selection count', async () => {
    const { user } = await openChip();

    await user.click(screen.getByRole('button', { name: dayButtonName(15) }));
    await user.click(screen.getByRole('button', { name: dayButtonName(20) }));

    const chip = screen.getByRole('button', { name: /Date range/ });
    expect(chip).toHaveTextContent('Date range');
    expect(chip.textContent).not.toMatch(/\d/);
  });

  it('opens the calendar on the month of the committed start', async () => {
    const lastMonth = subMonths(new Date(), 1);
    await openChip({ initialValue: { from: format(setDate(lastMonth, 15), 'yyyy-MM-dd') } });

    expect(screen.getByText(format(lastMonth, 'MMMM yyyy'))).toBeInTheDocument();
  });

  it('opens the calendar on the current month with no selection', async () => {
    await openChip();

    expect(screen.getByText(format(new Date(), 'MMMM yyyy'))).toBeInTheDocument();
  });

  it('keeps month navigation out of the filter state', async () => {
    const { load, user } = await openChip();
    load.mockClear();

    await user.click(screen.getByRole('button', { name: /previous month/i }));

    expect(screen.getByText(format(subMonths(new Date(), 1), 'MMMM yyyy'))).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  describe('All Filters dialog', () => {
    async function openDialogSection() {
      const rendered = await renderGrid({ withAllFilters: true });

      await rendered.user.click(screen.getByRole('button', { name: messages.filters.allFilters }));
      const dialog = await screen.findByRole('dialog');
      await rendered.user.click(within(dialog).getByRole('button', { name: 'Date range' }));

      return { ...rendered, dialog };
    }

    it('writes to the draft store without reloading the grid', async () => {
      const { load, user, dialog } = await openDialogSection();

      load.mockClear();
      await user.click(within(dialog).getByRole('button', { name: dayButtonName(15) }));
      await user.click(within(dialog).getByRole('button', { name: dayButtonName(20) }));

      expect(load).not.toHaveBeenCalled();
    });

    it('reaches the load context once the dialog is applied', async () => {
      const { load, user, dialog } = await openDialogSection();

      await user.click(within(dialog).getByRole('button', { name: dayButtonName(15) }));
      await user.click(within(dialog).getByRole('button', { name: dayButtonName(20) }));
      await user.click(within(dialog).getByRole('button', { name: messages.filters.apply }));

      expect(lastRangeValue(load)).toEqual({
        from: dayOfCurrentMonth(15),
        to: dayOfCurrentMonth(20),
      });
    });
  });
});
