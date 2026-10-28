import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../../../../__test-utils__/render-with-user';
import { Button } from '../../../button/public.js';
import { DataGrid } from '../../data-grid';
import type { DataGridLoadResult } from '../../data-grid-types';
import type { DataGridTableColumn } from '../../services/table/table-types';
import { DataGridRowClickPlugin } from './row-click-plugin';

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

const data: Item[] = [
  { id: 1, name: 'John Doe' },
  { id: 2, name: 'Jane Smith' },
  { id: 3, name: 'Bob Johnson' },
];

const columns: DataGridTableColumn<Item>[] = [
  { id: 'name', label: 'Name' },
  {
    id: 'action',
    label: 'Action',
    // The attribute is what a consumer puts on anything interactive inside a clickable row.
    component: () => <Button data-grid-row-ignore-click>Action</Button>,
  },
];

function load(): Promise<DataGridLoadResult<Item>> {
  return Promise.resolve({ results: data, total: data.length });
}

function renderGrid(name: string, props: Parameters<typeof DataGridRowClickPlugin<Item>>[0]) {
  return render(
    <DataGrid name={name} persistent="memory" load={load} columns={columns}>
      <DataGridRowClickPlugin<Item> {...props} />
    </DataGrid>,
  );
}

async function bodyRows() {
  const table = await screen.findByRole('table');
  await screen.findByText('John Doe');
  return within(table)
    .getAllByRole('row')
    .filter((row) => row.closest('tbody'));
}

describe('DataGridRowClickPlugin', () => {
  it('makes every body row focusable, and the header row not', async () => {
    renderGrid('row_click_focus', { click: vi.fn() });

    const rows = await bodyRows();

    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('row')[0]).not.toHaveAttribute('tabindex');
  });

  it('calls click with the row item on a click, and dblclick on a double click', async () => {
    const click = vi.fn();
    const dblclick = vi.fn();
    const { user } = renderGrid('row_click_click', { click, dblclick });
    const rows = await bodyRows();

    await user.click(rows[0]);
    expect(click).toHaveBeenLastCalledWith(data[0]);
    expect(dblclick).not.toHaveBeenCalled();

    // A double click is two clicks and then the double click, as in a browser.
    await user.dblClick(rows[1]);
    expect(dblclick).toHaveBeenCalledOnce();
    expect(dblclick).toHaveBeenCalledWith(data[1]);
    expect(click).toHaveBeenLastCalledWith(data[1]);
  });

  it('calls click on Enter in a focused row', async () => {
    const click = vi.fn();
    const { user } = renderGrid('row_click_enter', { click });
    const rows = await bodyRows();

    rows[2].focus();
    await user.keyboard('{Enter}');
    expect(click).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledWith(data[2]);
  });

  it('does not fire for an element marked to ignore row clicks, but does for the rest of its row', async () => {
    const click = vi.fn();
    const { user } = renderGrid('row_click_ignore', { click });
    const rows = await bodyRows();

    await user.click(within(rows[0]).getByRole('button', { name: 'Action' }));
    expect(click).not.toHaveBeenCalled();

    await user.click(within(rows[0]).getByText('John Doe'));
    expect(click).toHaveBeenCalledWith(data[0]);
  });

  it('reads the callbacks of the latest props', async () => {
    const first = vi.fn();
    const second = vi.fn();
    function Grid({ click }: { click: () => void }) {
      return (
        <DataGrid name="row_click_latest" persistent="memory" load={load} columns={columns}>
          <DataGridRowClickPlugin<Item> click={click} />
        </DataGrid>
      );
    }
    const { user, rerender } = render(<Grid click={first} />);
    const rows = await bodyRows();

    rerender(<Grid click={second} />);
    await user.click(rows[0]);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(data[0]);
  });
});
