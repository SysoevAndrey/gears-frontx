import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../../../../__test-utils__/render-with-user';
import { Button } from '../../../button/public.js';
import { DataGrid } from '../../data-grid';
import type { DataGridLoadResult } from '../../data-grid-types';
import type { DataGridTableColumn } from '../../services/table/table-types';
import { DataGridActionsPlugin } from './actions-plugin';

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

function load(): Promise<DataGridLoadResult<Item>> {
  return Promise.resolve({ results: [{ id: 1, name: 'Item A' }], total: 1 });
}

function Toolbar({ label = 'Add Item' }: { label?: string }) {
  return <Button>{label}</Button>;
}

function renderGrid(name: string, plugin: React.ReactNode) {
  return render(
    <DataGrid name={name} persistent="memory" load={load} columns={columns}>
      {plugin}
    </DataGrid>,
  );
}

describe('DataGridActionsPlugin', () => {
  it('renders the consumer component in the toolbar, with the props it was given', async () => {
    renderGrid('actions_props', <DataGridActionsPlugin component={Toolbar} props={{ label: 'Invite' }} />);

    expect(await screen.findByRole('button', { name: 'Invite' })).toBeInTheDocument();
    // The toolbar sits outside the table.
    expect(screen.getByRole('table')).not.toContainElement(screen.getByRole('button', { name: 'Invite' }));
  });

  it('renders the component without props when none are given', async () => {
    renderGrid('actions_no_props', <DataGridActionsPlugin component={Toolbar} />);

    expect(await screen.findByRole('button', { name: 'Add Item' })).toBeInTheDocument();
  });

  it('keeps the component interactive and follows a change of component and props', async () => {
    function Counter() {
      const [count, setCount] = useState(0);
      return <Button onClick={() => setCount(count + 1)}>{`Clicked ${count}`}</Button>;
    }
    function Grid({ swap }: { swap: boolean }) {
      return (
        <DataGrid name="actions_swap" persistent="memory" load={load} columns={columns}>
          {swap ? (
            <DataGridActionsPlugin component={Toolbar} props={{ label: 'Export' }} />
          ) : (
            <DataGridActionsPlugin component={Counter} />
          )}
        </DataGrid>
      );
    }
    const { user, rerender } = render(<Grid swap={false} />);

    await user.click(await screen.findByRole('button', { name: 'Clicked 0' }));
    expect(screen.getByRole('button', { name: 'Clicked 1' })).toBeInTheDocument();

    rerender(<Grid swap />);

    expect(await screen.findByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clicked/ })).not.toBeInTheDocument();
  });
});
