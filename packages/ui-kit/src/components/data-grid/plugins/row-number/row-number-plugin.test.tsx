import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../../../../__test-utils__/render-with-user';
import { DataGrid } from '../../data-grid';
import type { DataGridLoadContext, DataGridLoadResult } from '../../data-grid-types';
import { messages } from '../../messages';
import type { DataGridTableColumn } from '../../services/table/table-types';
import { DataGridPaginationPlugin } from '../pagination/pagination-plugin';
import { DataGridRowNumberPlugin } from './row-number-plugin';

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(function () {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }),
);

interface Item {
  id: number;
  name: string;
}

const columns: DataGridTableColumn<Item>[] = [{ id: 'name', label: 'Name' }];

const TOTAL = 12;

function load({ pagination }: DataGridLoadContext): Promise<DataGridLoadResult<Item>> {
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? TOTAL;
  const start = (page - 1) * limit;
  const results = Array.from({ length: Math.max(0, Math.min(limit, TOTAL - start)) }, (_, i) => ({
    id: start + i + 1,
    name: `Item ${start + i + 1}`,
  }));
  return Promise.resolve({ results, total: TOTAL });
}

function bodyRows() {
  const table = screen.getByRole('table');
  return within(table)
    .getAllByRole('row')
    .filter((row) => row.closest('tbody'));
}

function numbers() {
  return bodyRows().map((row) => within(row).getAllByRole('cell')[0]?.textContent);
}

describe('DataGridRowNumberPlugin', () => {
  it('numbers the rows from 1 in a column before the data, with no header text', async () => {
    render(
      <DataGrid name="row_number_basic" persistent="memory" load={load} columns={columns}>
        <DataGridRowNumberPlugin />
      </DataGrid>,
    );

    await screen.findByText('Item 1');

    expect(numbers()).toEqual(Array.from({ length: TOTAL }, (_, i) => String(i + 1)));
    // The number is the first cell of the row; the data follows it.
    expect(within(bodyRows()[0]).getAllByRole('cell')[1]).toHaveTextContent('Item 1');
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('');
  });

  it('continues the numbering across pages', async () => {
    const { user } = render(
      <DataGrid name="row_number_pages" persistent="memory" load={load} columns={columns}>
        <DataGridPaginationPlugin defaultLimit={5} limits={[5]} />
        <DataGridRowNumberPlugin />
      </DataGrid>,
    );

    await screen.findByText('Item 1');
    expect(numbers()).toEqual(['1', '2', '3', '4', '5']);

    await user.click(screen.getByRole('button', { name: messages.pagination.nextPage }));

    await waitFor(() => expect(numbers()).toEqual(['6', '7', '8', '9', '10']));
    expect(screen.getByText('Item 6')).toBeInTheDocument();
  });
});
