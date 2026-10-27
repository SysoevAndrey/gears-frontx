import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { render } from '../../../../../__test-utils__/render-with-user';
import { DataGrid } from '../../../data-grid';
import { createDataGridPlugin } from '../../plugins/plugins-helpers';
import type { DataGridLoadResult } from '../../../data-grid-types';
import tableStyles from '../../../../table/table.module.css';
import type { DataGridTableColumn } from '../table-types';

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
  notes: string | null;
}

const testData: TestItem[] = [
  { id: 1, name: 'John Doe', bio: 'A very long biography.', notes: null },
];

function loadData(): Promise<DataGridLoadResult<TestItem>> {
  return Promise.resolve({ results: testData, total: testData.length });
}

function renderGridWithColumns(
  columns: DataGridTableColumn<TestItem>[],
  name: string,
  tableLayout?: 'fixed' | 'auto',
) {
  return render(
    <DataGrid name={name} load={loadData} columns={columns} tableLayout={tableLayout} />,
  );
}

function findBodyCell(scope: HTMLElement, text: string) {
  const cells = within(scope).getAllByRole('cell');
  return cells.find((cell) => cell.textContent?.includes(text));
}

describe('DataGridCell — body overflow', () => {

  it('defaults data-overflow to "wrap" when cellOverflow is omitted', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [{ id: 'bio', label: 'Bio' }];
    await renderGridWithColumns(columns, 'cell_overflow_default_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell).toBeDefined();
    expect(cell!.dataset.overflow).toBe('wrap');
    expect(cell!.title).toBe('');
  });

  it('marks the td with data-overflow="nowrap" when cellOverflow is "nowrap"', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [
      { id: 'bio', label: 'Bio', cellOverflow: 'nowrap' },
    ];
    await renderGridWithColumns(columns, 'cell_overflow_nowrap_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.dataset.overflow).toBe('nowrap');
  });

  it('sets a title fallback with the plain value when cellOverflow is "nowrap"', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [
      { id: 'bio', label: 'Bio', cellOverflow: 'nowrap' },
    ];
    await renderGridWithColumns(columns, 'cell_overflow_nowrap_title_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.dataset.overflow).toBe('nowrap');
    expect(cell!.title).toBe('A very long biography.');
  });

  it('uses the formatted value for the title fallback, not the raw value', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [
      {
        id: 'bio',
        label: 'Bio',
        cellOverflow: 'nowrap',
        formatter: (value) => `Formatted: ${value as string}`,
      },
    ];
    await renderGridWithColumns(columns, 'cell_overflow_formatter_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'Formatted: A very long biography.');

    expect(cell!.title).toBe('Formatted: A very long biography.');
  });

  it('omits the title fallback for a custom render function even with cellOverflow nowrap', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [
      {
        id: 'bio',
        label: 'Bio',
        cellOverflow: 'nowrap',
        render: (item) => <strong>{item.bio}</strong>,
      },
    ];
    await renderGridWithColumns(columns, 'cell_overflow_render_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.dataset.overflow).toBe('nowrap');
    expect(cell!.title).toBe('');
  });

  it('omits the title fallback for a custom component even with cellOverflow nowrap', async () => {
    function BioCell({ value }: { value: unknown }) {
      return <em>{value as string}</em>;
    }
    const columns: DataGridTableColumn<TestItem>[] = [
      { id: 'bio', label: 'Bio', cellOverflow: 'nowrap', component: BioCell },
    ];
    await renderGridWithColumns(columns, 'cell_overflow_component_grid');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.title).toBe('');
  });

  it('does not set a title attribute when the stringified value is empty (e.g. null)', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [
      { id: 'notes', label: 'Notes', cellOverflow: 'nowrap' },
    ];
    await renderGridWithColumns(columns, 'cell_overflow_empty_value_grid');

    const table = await screen.findByRole('table');
    const cell = within(table).getAllByRole('cell')[0];

    expect(cell).not.toHaveAttribute('title');
  });
});

describe('DataGridCell — auto-mode maxWidth cap', () => {

  it.each(['wrap', 'nowrap'] as const)(
    'marks the td data-capped and carries the cap var for cellOverflow="%s"',
    async (cellOverflow) => {
      const columns: DataGridTableColumn<TestItem>[] = [
        { id: 'bio', label: 'Bio', maxWidth: 160, cellOverflow },
      ];
      await renderGridWithColumns(columns, `cap_${cellOverflow}_auto_grid`, 'auto');

      const table = await screen.findByRole('table');
      const cell = findBodyCell(table, 'A very long biography.');

      expect(cell!.dataset.capped).toBe('true');
      expect(cell!.style.getPropertyValue('--_data-grid-col-max')).toBe('160px');
    },
  );

  it('does not mark the td data-capped under tableLayout="fixed" even with maxWidth set', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [{ id: 'bio', label: 'Bio', maxWidth: 160 }];
    await renderGridWithColumns(columns, 'cap_fixed_grid', 'fixed');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.dataset.capped).toBeUndefined();
    expect(cell!.style.getPropertyValue('--_data-grid-col-max')).toBe('');
  });

  it('does not mark the td data-capped under tableLayout="auto" when maxWidth is unset', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [{ id: 'bio', label: 'Bio', width: 150 }];
    await renderGridWithColumns(columns, 'cap_no_max_width_grid', 'auto');

    const table = await screen.findByRole('table');
    const cell = findBodyCell(table, 'A very long biography.');

    expect(cell!.dataset.capped).toBeUndefined();
  });
});

describe('DataGridTable — tableLayout', () => {

  it('applies the layoutFixed modifier class by default', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [{ id: 'name', label: 'Name' }];
    await renderGridWithColumns(columns, 'table_layout_default_grid');

    const table = await screen.findByRole('table');

    expect(table.className).toContain('layoutFixed');
    expect(table.className).not.toContain('layoutAuto');
  });

  it('applies the layoutAuto modifier class when tableLayout="auto"', async () => {
    const columns: DataGridTableColumn<TestItem>[] = [{ id: 'name', label: 'Name' }];
    await renderGridWithColumns(columns, 'table_layout_auto_grid', 'auto');

    const table = await screen.findByRole('table');

    expect(table.className).toContain('layoutAuto');
    expect(table.className).not.toContain('layoutFixed');
  });
});

describe('DataGridCell — pinned column', () => {
  const columns: DataGridTableColumn<TestItem>[] = [
    { id: 'name', label: 'Name', sticky: true },
    { id: 'bio', label: 'Bio' },
  ];

  it('pins the header and body cells of a sticky column on the start edge, and no other column', async () => {
    await renderGridWithColumns(columns, 'cell_pinned_column_grid');

    const table = await screen.findByRole('table');
    const scope = within(table);
    const pinned = [
      scope.getByRole('columnheader', { name: 'Name' }),
      scope.getByRole('cell', { name: 'John Doe' }),
    ];
    const free = [
      scope.getByRole('columnheader', { name: 'Bio' }),
      scope.getByRole('cell', { name: 'A very long biography.' }),
    ];

    for (const cell of pinned) {
      // Table owns the pin (sticky, its layer and the row's fill); the grid supplies the offset.
      expect(cell.className).toContain(tableStyles.pinned);
      expect(cell.style.insetInlineStart).toBe('0px');
    }
    for (const cell of free) {
      expect(cell.className).not.toContain(tableStyles.pinned);
      expect(cell.style.insetInlineStart).toBe('');
    }
  });

  it('pins a column the grid registers before the data in front of a pinned column, so the offsets agree', async () => {
    const ExtraColumn = createDataGridPlugin('extra_column', (context) => {
      context.registerExtraColumn({
        id: 'extra',
        position: 'start',
        order: 5,
        width: '40px',
        header: () => <span>pick</span>,
        body: () => <span>x</span>,
      });
      return {};
    });
    render(
      <DataGrid name="cell_pinned_extra_grid" load={loadData} columns={columns}>
        <ExtraColumn />
      </DataGrid>,
    );

    const table = await screen.findByRole('table');
    const extraCells = Array.from(table.querySelectorAll<HTMLElement>('[data-column-id="extra"]'));
    const nameCells = Array.from(table.querySelectorAll<HTMLElement>('[data-column-id="name"]'));

    expect(extraCells).toHaveLength(2);
    for (const cell of extraCells) {
      expect(cell.className).toContain(tableStyles.pinned);
      expect(cell.style.insetInlineStart).toBe('0px');
    }
    // The pinned data column is offset by the extra column's width, which now stays in view.
    for (const cell of nameCells) {
      expect(cell.style.insetInlineStart).toBe('40px');
    }
  });
});
