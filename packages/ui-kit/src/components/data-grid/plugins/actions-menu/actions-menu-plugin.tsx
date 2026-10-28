// Load-bearing: a plugin is rendered as a child of <DataGrid>, so a Server Component can import
// and render it, and the component it returns calls hooks. This directive puts the banner on the
// plugin's own entry chunk (dist/data-grid/<plugin>.js). client-boundaries.test.ts only scans a
// component's top-level files, so scripts/verify-consumer.sh is what checks the built banner of
// every plugin entry.
'use client';

import { create } from 'zustand';
import type { DataGridItem } from '../../data-grid-types';
import { createDataGridPlugin } from '../../services/plugins/plugins-helpers';
import type {
  DataGridActionsMenuItem,
  DataGridActionsMenuItemOption,
  DataGridActionsMenuPluginApi,
  DataGridActionsMenuPluginProps,
} from './actions-menu-types';
import { DataGridActionsMenu } from './components/data-grid-actions-menu';

interface ActionsMenuStore {
  menuItems: DataGridActionsMenuItem[];
}

export const DataGridActionsMenuPlugin = createDataGridPlugin<
  DataGridItem,
  'actionsMenu',
  DataGridActionsMenuPluginProps,
  DataGridActionsMenuPluginApi
>('actionsMenu', (context) => {
  const useStore = create<ActionsMenuStore>(() => ({
    menuItems: [],
  }));

  context.registerSlot('top-end', {
    id: 'actionsMenu',
    component: DataGridActionsMenu,
    order: 100,
  });

  const useMenuItems = () => useStore((s) => s.menuItems);

  const api: DataGridActionsMenuPluginApi = {
    registerMenuItem,
    useMenuItems,
    onPropsChange,
  };

  return api;

  function registerMenuItem(options: DataGridActionsMenuItemOption) {
    const id = Math.random().toString();
    const currentItems = useStore.getState().menuItems;
    const order = options.order ?? (currentItems.length + 1) * 10;
    const newMenuItem = { id, ...options, order };
    const updatedItems = [...currentItems, newMenuItem].sort((a, b) => a.order - b.order);
    useStore.setState({ menuItems: updatedItems });
  }

  function onPropsChange(props: DataGridActionsMenuPluginProps) {
    const items: DataGridActionsMenuItem[] = props.menuItems.map((options, index) => {
      const id = Math.random().toString();
      const order = options.order ?? (index + 1) * 10;
      return { id, ...options, order } satisfies DataGridActionsMenuItem;
    });
    items.sort((a, b) => a.order - b.order);
    useStore.setState({ menuItems: items });
  }
});
