import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../../../../../__test-utils__/render-with-user';
import { DataGrid } from '../../../data-grid';
import type { DataGridLoadResult } from '../../../data-grid-types';
import type { DataGridTableColumn } from '../../../services/table/table-types';
import { DataGridTableTreePlugin } from '../table-tree-plugin';

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

interface TreeItem {
  id: number;
  name: string;
  bio: string;
  parent_id: number | null;
  has_children: boolean;
}

const treeData: TreeItem[] = [
  { id: 1, name: 'Root', bio: 'A very long biography.', parent_id: null, has_children: false },
];

function loadData(): Promise<DataGridLoadResult<TreeItem>> {
  return Promise.resolve({ results: treeData, total: treeData.length });
}

function renderTreeWithColumns(
  columns: DataGridTableColumn<TreeItem>[],
  name: string,
  tableLayout?: 'fixed' | 'auto',
) {
  return render(
    <DataGrid name={name} load={loadData} columns={columns} tableLayout={tableLayout}>
      <DataGridTableTreePlugin<TreeItem> parentKey="parent_id" />
    </DataGrid>,
  );
}

function findBodyCell(scope: HTMLElement, text: string) {
  const cells = within(scope).getAllByRole('cell');
  return cells.find((cell) => cell.textContent?.includes(text));
}

describe('DataGridTableTreeRow — overflow wiring under the table-tree plugin', () => {
  it('defaults data-overflow to "wrap" when cellOverflow is omitted', async () => {
    const columns: DataGridTableColumn<TreeItem>[] = [{ id: 'bio', label: 'Bio' }];
    renderTreeWithColumns(columns, 'tree_overflow_default_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell).toBeDefined();
    expect(cell!.dataset.overflow).toBe('wrap');
  });

  it('marks the td data-overflow="nowrap" and sets the title fallback when cellOverflow is "nowrap"', async () => {
    const columns: DataGridTableColumn<TreeItem>[] = [
      { id: 'bio', label: 'Bio', cellOverflow: 'nowrap' },
    ];
    renderTreeWithColumns(columns, 'tree_overflow_nowrap_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.dataset.overflow).toBe('nowrap');
    expect(cell!.title).toBe('A very long biography.');
  });

  // The stylesheet lifts the nowrap clip off the tree cell's content block with
  // `[data-overflow='nowrap'] > span:has(> .treeCellContent)`; this holds that shape of the DOM.
  it('renders a nowrap tree cell as a td whose first child is a span holding the tree content', async () => {
    const columns: DataGridTableColumn<TreeItem>[] = [
      { id: 'name', label: 'Name', cellOverflow: 'nowrap' },
    ];
    // The tree content wraps the first column's cell only of a row that has children.
    const withChild = [
      ...treeData,
      { id: 2, name: 'Leaf', bio: 'Short.', parent_id: 1, has_children: false },
    ];
    render(
      <DataGrid
        name="tree_overflow_nowrap_shape_grid"
        load={() => Promise.resolve({ results: withChild, total: withChild.length })}
        columns={columns}
      >
        <DataGridTableTreePlugin<TreeItem> parentKey="parent_id" />
      </DataGrid>,
    );

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'Root')!;

    expect(cell.dataset.overflow).toBe('nowrap');
    expect(cell.firstElementChild?.tagName).toBe('SPAN');
    expect(cell.firstElementChild?.firstElementChild?.className).toMatch(/treeCellContent/);
  });

  it('marks the td data-capped and carries the max-width cap var under tableLayout="auto"', async () => {
    const columns: DataGridTableColumn<TreeItem>[] = [{ id: 'bio', label: 'Bio', maxWidth: 160 }];
    renderTreeWithColumns(columns, 'tree_overflow_cap_grid', 'auto');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.dataset.capped).toBe('true');
    expect(cell!.style.getPropertyValue('--_data-grid-col-max')).toBe('160px');
  });

  it('does not carry the raw column width into the body cell style (width lives on the header only)', async () => {
    const columns: DataGridTableColumn<TreeItem>[] = [{ id: 'bio', label: 'Bio', width: 300 }];
    renderTreeWithColumns(columns, 'tree_overflow_width_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.style.width).toBe('');
  });
});
