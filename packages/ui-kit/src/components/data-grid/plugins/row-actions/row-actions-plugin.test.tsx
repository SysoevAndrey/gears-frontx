import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../../../../__test-utils__/render-with-user';
import { Button } from '../../../button/public.js';
import tableStyles from '../../../table/table.module.css';
import { DataGrid } from '../../data-grid';
import type { DataGridLoadResult } from '../../data-grid-types';
import type { DataGridTableColumn } from '../../services/table/table-types';
import { DataGridRowClickPlugin } from '../row-click/row-click-plugin';
import { DataGridRowActionsPlugin } from './row-actions-plugin';

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
];

const columns: DataGridTableColumn<Item>[] = [{ id: 'name', label: 'Name' }];

function load(): Promise<DataGridLoadResult<Item>> {
  return Promise.resolve({ results: data, total: data.length });
}

function RowActions({ item }: { item: Item }) {
  return (
    <>
      <Button aria-label={`Edit ${item.name}`}>Edit</Button>
      <Button aria-label={`Delete ${item.name}`}>Delete</Button>
    </>
  );
}

// The actions column is the last one in the table, in the header row as in every body row.
function actionsCells(table: HTMLElement) {
  const scope = within(table);
  const headers = scope.getAllByRole('columnheader');
  const cells = scope.getAllByRole('cell');
  return [headers[headers.length - 1], cells[cells.length - 1]];
}

describe('DataGridRowActionsPlugin', () => {
  it('renders the component in a last column of every row, with that row\'s item', async () => {
    const { user } = render(
      <DataGrid name="row_actions_rows" persistent="memory" load={load} columns={columns}>
        <DataGridRowActionsPlugin<Item> component={RowActions} />
      </DataGrid>,
    );

    const table = await screen.findByRole('table');
    await screen.findByText('John Doe');
    const rows = within(table)
      .getAllByRole('row')
      .filter((row) => row.closest('tbody'));

    expect(rows).toHaveLength(2);
    for (const [index, row] of rows.entries()) {
      const cells = within(row).getAllByRole('cell');
      // After the data column, and holding this row's buttons only.
      expect(cells[0]).toHaveTextContent(data[index].name);
      expect(
        within(cells[cells.length - 1]).getByRole('button', { name: `Edit ${data[index].name}` }),
      ).toBeInTheDocument();
    }
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);

    const edit = screen.getByRole('button', { name: 'Edit John Doe' });
    await user.click(edit);
    expect(edit).toHaveFocus();
  });

  it('puts the className on the wrapper around the component', async () => {
    render(
      <DataGrid name="row_actions_class" persistent="memory" load={load} columns={columns}>
        <DataGridRowActionsPlugin<Item> component={RowActions} className="mine" />
      </DataGrid>,
    );

    const edit = await screen.findByRole('button', { name: 'Edit John Doe' });

    expect(edit.parentElement).toHaveClass('mine');
  });

  it('follows a change of component and className on a mounted grid', async () => {
    function Other({ item }: { item: Item }) {
      return <span>{`Other ${item.name}`}</span>;
    }
    function Grid({ other }: { other: boolean }) {
      return (
        <DataGrid name="row_actions_swap" persistent="memory" load={load} columns={columns}>
          <DataGridRowActionsPlugin<Item>
            component={other ? Other : RowActions}
            className={other ? 'second' : 'first'}
          />
        </DataGrid>
      );
    }
    const { rerender } = render(<Grid other={false} />);
    await screen.findByRole('button', { name: 'Edit John Doe' });

    rerender(<Grid other />);

    const replaced = await screen.findByText('Other John Doe');
    expect(replaced.parentElement).toHaveClass('second');
    expect(screen.queryByRole('button', { name: 'Edit John Doe' })).not.toBeInTheDocument();
  });

  it('keeps a click on the actions from also firing the row click', async () => {
    const click = vi.fn();
    const { user } = render(
      <DataGrid name="row_actions_row_click" persistent="memory" load={load} columns={columns}>
        <DataGridRowClickPlugin<Item> click={click} />
        <DataGridRowActionsPlugin<Item> component={RowActions} />
      </DataGrid>,
    );
    await screen.findByText('John Doe');

    await user.click(screen.getByRole('button', { name: 'Edit John Doe' }));
    expect(click).not.toHaveBeenCalled();

    await user.click(screen.getByText('John Doe'));
    expect(click).toHaveBeenCalledWith(data[0]);
  });
});

describe('DataGridRowActionsPlugin — sticky', () => {
  function Grid({ name, sticky }: { name: string; sticky?: boolean }) {
    return (
      <DataGrid name={name} persistent="memory" load={load} columns={columns}>
        <DataGridRowActionsPlugin<Item> component={RowActions} sticky={sticky} />
      </DataGrid>
    );
  }

  it('leaves the actions column unpinned when the plugin gets no sticky prop', async () => {
    render(<Grid name="row_actions_unpinned_grid" />);

    const table = await screen.findByRole('table');

    for (const cell of actionsCells(table)) {
      expect(cell.style.insetInlineEnd).toBe('');
      expect(cell.className).not.toContain(tableStyles.pinned);
    }
  });

  it('pins the actions column to the inline-end edge when the plugin gets sticky', async () => {
    render(<Grid name="row_actions_pinned_grid" sticky />);

    const table = await screen.findByRole('table');

    for (const cell of actionsCells(table)) {
      // The only pinned column, so it sits flush against the edge. The kit's Table makes a pinned
      // cell sticky and opaque; the grid gives it the offset.
      expect(cell.style.insetInlineEnd).toBe('0px');
      expect(cell.className).toContain(tableStyles.pinned);
    }
  });

  it('pins and unpins as the prop flips on a mounted grid', async () => {
    function ToggleGrid() {
      const [sticky, setSticky] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setSticky((value) => !value)}>
            toggle
          </button>
          <Grid name="row_actions_toggle_grid" sticky={sticky} />
        </>
      );
    }

    const { user } = render(<ToggleGrid />);

    const table = await screen.findByRole('table');
    const actionsBodyCell = () => actionsCells(table)[1];
    expect(actionsBodyCell().className).not.toContain(tableStyles.pinned);

    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(actionsBodyCell().className).toContain(tableStyles.pinned);

    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(actionsBodyCell().className).not.toContain(tableStyles.pinned);
  });
});
