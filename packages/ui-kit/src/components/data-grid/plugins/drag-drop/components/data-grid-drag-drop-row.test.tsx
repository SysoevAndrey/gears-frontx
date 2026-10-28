import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../../../../../__test-utils__/render-with-user';
import { DataGrid } from '../../../data-grid';
import type { DataGridLoadResult } from '../../../data-grid-types';
import type { DataGridTableColumn } from '../../../services/table/table-types';
import { createDataGridDragDropPlugin } from '../drag-drop-plugin';

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
  bio: string;
}

const testData: TestItem[] = [{ id: 1, name: 'John Doe', bio: 'A very long biography.' }];

function loadData(): Promise<DataGridLoadResult<TestItem>> {
  return Promise.resolve({ results: testData, total: testData.length });
}

function renderGridWithColumns(
  columns: DataGridTableColumn<TestItem>[],
  name: string,
  tableLayout?: 'fixed' | 'auto',
) {
  const DragDrop = createDataGridDragDropPlugin<TestItem>({ onDrop: vi.fn() });
  return render(
    <DataGrid name={name} load={loadData} columns={columns} tableLayout={tableLayout}>
      <DragDrop />
    </DataGrid>,
  );
}

function findBodyCell(scope: HTMLElement, text: string) {
  const cells = within(scope).getAllByRole('cell');
  return cells.find((cell) => cell.textContent?.includes(text));
}

describe('DataGridDragDropRow — overflow wiring under the drag-drop plugin', () => {
  it('defaults data-overflow to "wrap" when cellOverflow is omitted', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [{ id: 'bio', label: 'Bio' }];
    renderGridWithColumns(columns, 'drag_drop_overflow_default_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell).toBeDefined();
    expect(cell!.dataset.overflow).toBe('wrap');
  });

  it('marks the td data-overflow="nowrap" and sets the title fallback when cellOverflow is "nowrap"', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [
      { id: 'bio', label: 'Bio', cellOverflow: 'nowrap' },
    ];
    renderGridWithColumns(columns, 'drag_drop_overflow_nowrap_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.dataset.overflow).toBe('nowrap');
    expect(cell!.title).toBe('A very long biography.');
  });

  it('marks the td data-capped and carries the max-width cap var under tableLayout="auto"', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [{ id: 'bio', label: 'Bio', maxWidth: 160 }];
    renderGridWithColumns(columns, 'drag_drop_overflow_cap_grid', 'auto');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.dataset.capped).toBe('true');
    expect(cell!.style.getPropertyValue('--_data-grid-col-max')).toBe('160px');
  });

  it('does not carry the raw column width into the body cell style (width lives on the header only)', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [{ id: 'bio', label: 'Bio', width: 300 }];
    renderGridWithColumns(columns, 'drag_drop_overflow_width_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.style.width).toBe('');
  });
});
