// Load-bearing: a plugin is rendered as a child of <DataGrid>, so a Server Component can import
// and render it, and the component it returns calls hooks. This directive puts the banner on the
// plugin's own entry chunk (dist/data-grid/<plugin>.js). client-boundaries.test.ts only scans a
// component's top-level files, so scripts/verify-consumer.sh is what checks the built banner of
// every plugin entry.
'use client';

import type { ComponentType, ReactNode } from 'react';
import { create } from 'zustand';
import type { DataGridItem } from '../../data-grid-types';
import { createColumnAutoSize } from '../../services/columns/create-column-auto-size';
import { createDataGridPlugin } from '../../services/plugins/plugins-helpers';
import { DataGridRowActionsCell } from './components/data-grid-row-actions-cell';
import type {
  DataGridRowActionsPluginApi,
  DataGridRowActionsPluginProps,
} from './row-actions-types';

export type { DataGridRowActionsPluginApi, DataGridRowActionsPluginProps };

const rowActionsColumnId = 'row-actions';
const defaultOrder = 100;

interface RowActionsStore {
  component: ComponentType<{ item: DataGridItem }> | null;
  className: string | undefined;
}

const DataGridRowActionsPluginRaw = createDataGridPlugin<
  DataGridItem,
  'rowActions',
  DataGridRowActionsPluginProps
>('rowActions', (context) => {
  const useStore = create<RowActionsStore>(() => ({
    component: null,
    className: undefined,
  }));

  const { measureRef, destroy } = createColumnAutoSize((width) => {
    context.updateExtraColumnWidth(rowActionsColumnId, width);
  });

  context.hook('destroy', destroy);

  context.registerExtraColumn({
    id: rowActionsColumnId,
    position: 'end',
    order: defaultOrder,
    body: DataGridRowActionsCell,
  });

  const useComponent = () => useStore((s) => s.component);
  const useClassName = () => useStore((s) => s.className);

  const api: DataGridRowActionsPluginApi = {
    useComponent,
    useClassName,
    measureRef,
    onPropsChange,
  };

  return api;

  function onPropsChange(props: DataGridRowActionsPluginProps) {
    useStore.setState({
      component: props.component,
      className: props.className,
    });

    if (props.order !== undefined) {
      context.updateExtraColumnOrder(rowActionsColumnId, props.order);
    }

    context.updateExtraColumnSticky(rowActionsColumnId, props.sticky ?? false);
  }
});

// The plugin is built for the base item type; the cast hands the consumer a generic component, so
// `<DataGridRowActionsPlugin<User> component={UserActions} />` types the item its component gets.
export const DataGridRowActionsPlugin = DataGridRowActionsPluginRaw as <
  TItem extends DataGridItem = DataGridItem,
>(
  props: DataGridRowActionsPluginProps<TItem>,
) => ReactNode;
