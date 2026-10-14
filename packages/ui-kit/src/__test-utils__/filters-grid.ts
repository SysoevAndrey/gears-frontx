import { screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { vi } from 'vitest';

import { DataGrid } from '../components/data-grid/data-grid';
import type {
  DataGridLoadContext,
  DataGridLoadResult,
} from '../components/data-grid/data-grid-types';
import type { DataGridFilterEntity } from '../components/data-grid/plugins/filters/filters-types';
import { DataGridFiltersPlugin } from '../components/data-grid/plugins/filters/filters-plugin';
import type {
  DataGridTableColumn,
  DataGridTableGroup,
} from '../components/data-grid/services/table/table-types';
import { render } from './render-with-user';

// jsdom measures nothing, and the grid's header observes its cells.
vi.stubGlobal(
  'ResizeObserver',
  vi.fn(function () {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }),
);

export interface FiltersGridItem {
  id: number;
  name: string;
}

const defaultColumns: DataGridTableColumn<FiltersGridItem>[] = [{ id: 'name', label: 'Name' }];

let gridCount = 0;

/** A `load` that records what it is asked and answers with one fixed row. */
export function createRecordingLoad() {
  return vi.fn((context: DataGridLoadContext): Promise<DataGridLoadResult<FiltersGridItem>> => {
    void context;
    return Promise.resolve({ results: [{ id: 1, name: 'Alice' }], total: 1 });
  });
}

export type RecordingLoad = ReturnType<typeof createRecordingLoad>;

/** The filters the grid last asked `load` for, keyed by filter key. */
export function lastFilters(load: RecordingLoad) {
  return load.mock.lastCall?.[0].filters;
}

interface RenderFiltersGridOptions {
  entities: DataGridFilterEntity[];
  /** The grid's name, which names its storage keys. Unique per call when left out. */
  name?: string;
  persistent?: 'localStorage' | 'sessionStorage' | 'memory' | 'router';
  isAllFiltersOptionVisible?: boolean;
  /** The grid's columns, one named Name unless given. */
  columns?: (DataGridTableColumn<FiltersGridItem> | DataGridTableGroup<FiltersGridItem>)[];
  load?: RecordingLoad;
  /** Rendered inside the grid next to the filters plugin. */
  children?: ReactNode;
}

/**
 * A grid with the filters plugin and a column of names, rendered and past its first load.
 * `storageKey` is where the plugin keeps its filters.
 */
export async function renderFiltersGrid({
  entities,
  name = `filters_grid_${++gridCount}`,
  persistent = 'localStorage',
  isAllFiltersOptionVisible,
  columns = defaultColumns,
  load = createRecordingLoad(),
  children,
}: RenderFiltersGridOptions) {
  const rendered = render(
    createElement(
      DataGrid<FiltersGridItem>,
      { name, load, columns, persistent },
      createElement(DataGridFiltersPlugin, { entities, isAllFiltersOptionVisible }),
      children,
    ),
  );
  await screen.findByRole('table');

  return { ...rendered, load, name, storageKey: `dataGrid:${name}:filters` };
}
