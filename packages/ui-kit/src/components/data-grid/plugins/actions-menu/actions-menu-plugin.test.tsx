import { screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../../../../__test-utils__/render-with-user';
import { Button } from '../../../button/public.js';
import { DropdownMenuItem } from '../../../dropdown-menu/public.js';
import { DataGrid } from '../../data-grid';
import type { DataGridLoadResult } from '../../data-grid-types';
import { messages } from '../../messages';
import { useDataGrid } from '../../services/core/data-grid-context';
import type { DataGridTableColumn } from '../../services/table/table-types';
import { DataGridActionsPlugin } from '../actions/actions-plugin';
import type {
  DataGridActionsMenuItemOption,
  DataGridActionsMenuPluginApi,
} from './actions-menu-types';
import { DataGridActionsMenuPlugin } from './actions-menu-plugin';

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

// An item component is whatever the consumer renders inside the menu; `params` is its input.
function MenuItem({ params }: { params?: Record<string, unknown> }) {
  return <DropdownMenuItem>{String(params?.label)}</DropdownMenuItem>;
}

function option(label: string, order?: number): DataGridActionsMenuItemOption {
  return { component: MenuItem, params: { label }, order };
}

function renderGrid(name: string, menuItems: DataGridActionsMenuItemOption[], extra?: React.ReactNode) {
  return render(
    <DataGrid name={name} persistent="memory" load={load} columns={columns}>
      <DataGridActionsMenuPlugin menuItems={menuItems} />
      {extra}
    </DataGrid>,
  );
}

async function openMenu(user: ReturnType<typeof render>['user']) {
  await user.click(await screen.findByRole('button', { name: messages.actionsMenu.actions }));
  return screen.findByRole('menu');
}

function labels(menu: HTMLElement) {
  return within(menu)
    .getAllByRole('menuitem')
    .map((item) => item.textContent);
}

describe('DataGridActionsMenuPlugin', () => {
  it('opens a menu from the Actions button and renders each item component with its params', async () => {
    const { user } = renderGrid('actions_menu_open', [option('Import'), option('Archive')]);

    const menu = await openMenu(user);

    expect(labels(menu)).toEqual(['Import', 'Archive']);
  });

  it("opens the menu in the grid's portalContainer", async () => {
    const container = document.body.appendChild(document.createElement('div'));
    const { user } = render(
      <DataGrid
        name="actions_menu_portal"
        persistent="memory"
        load={load}
        columns={columns}
        portalContainer={container}
      >
        <DataGridActionsMenuPlugin menuItems={[option('Import')]} />
      </DataGrid>,
    );

    expect(container).toContainElement(await openMenu(user));
    container.remove();
  });

  it('lists the items by order; an item without one is ranked by its position, ten apart', async () => {
    const { user } = renderGrid('actions_menu_order', [
      option('C', 30),
      option('A', 10),
      option('B', 20),
      // Fourth in the list, so its order is 40.
      option('D'),
    ]);

    expect(labels(await openMenu(user))).toEqual(['A', 'B', 'C', 'D']);
  });

  it('takes an item registered through the plugin API, ranked after the ones already there', async () => {
    function Registrar() {
      const grid = useDataGrid();
      useEffect(() => {
        grid.getPlugin<DataGridActionsMenuPluginApi>('actionsMenu')!.registerMenuItem(option('Late'));
        grid.getPlugin<DataGridActionsMenuPluginApi>('actionsMenu')!.registerMenuItem(option('First', 5));
      }, [grid]);
      return null;
    }
    const { user } = renderGrid('actions_menu_register', [option('Import')], <Registrar />);

    expect(labels(await openMenu(user))).toEqual(['First', 'Import', 'Late']);
  });

  it('replaces its items when the prop changes', async () => {
    function Grid({ items }: { items: DataGridActionsMenuItemOption[] }) {
      return (
        <DataGrid name="actions_menu_replace" persistent="memory" load={load} columns={columns}>
          <DataGridActionsMenuPlugin menuItems={items} />
        </DataGrid>
      );
    }
    const { user, rerender } = render(<Grid items={[option('Import'), option('Archive')]} />);
    await screen.findByRole('button', { name: messages.actionsMenu.actions });

    rerender(<Grid items={[option('Only')]} />);

    expect(labels(await openMenu(user))).toEqual(['Only']);
  });

  it('sits at the end of the toolbar, after an actions component', async () => {
    renderGrid(
      'actions_menu_toolbar',
      [option('Import')],
      <DataGridActionsPlugin component={() => <Button>Add item</Button>} />,
    );

    const actions = await screen.findByRole('button', { name: 'Add item' });
    const menuButton = screen.getByRole('button', { name: messages.actionsMenu.actions });

    expect(actions.compareDocumentPosition(menuButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
