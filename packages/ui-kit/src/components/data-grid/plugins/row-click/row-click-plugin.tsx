// Load-bearing: a plugin is rendered as a child of <DataGrid>, so a Server Component can import
// and render it, and the component it returns calls hooks. This directive puts the banner on the
// plugin's own entry chunk (dist/data-grid/<plugin>.js). client-boundaries.test.ts only scans a
// component's top-level files, so scripts/verify-consumer.sh is what checks the built banner of
// every plugin entry.
'use client';

import type { ReactNode } from 'react';
import type { DataGridItem } from '../../data-grid-types';
import { createDataGridPlugin } from '../../services/plugins/plugins-helpers';
import type { DataGridPluginApi } from '../../services/plugins/plugins-helpers';
import { DataGridRowClick } from './components/data-grid-row-click';

export type DataGridRowClickCallback<Item extends DataGridItem = DataGridItem> = (
  item: Item,
) => void;

export interface DataGridRowClickPluginProps<
  Item extends DataGridItem = DataGridItem,
> extends Record<string, unknown> {
  click?: DataGridRowClickCallback<Item>;
  dblclick?: DataGridRowClickCallback<Item>;
}

export interface DataGridRowClickPluginApi<
  Item extends DataGridItem = DataGridItem,
> extends DataGridPluginApi<DataGridRowClickPluginProps<Item>> {
  click?: DataGridRowClickCallback<Item>;
  dblclick?: DataGridRowClickCallback<Item>;
}

const DataGridRowClickPluginRaw = createDataGridPlugin<
  DataGridItem,
  'rowClick',
  DataGridRowClickPluginProps
>('rowClick', (context) => {
  context.registerComponent('row', DataGridRowClick);

  const api: DataGridRowClickPluginApi = {
    click: undefined,
    dblclick: undefined,
    onPropsChange(props: DataGridRowClickPluginProps) {
      api.click = props.click;
      api.dblclick = props.dblclick;
    },
  };

  return api;
});

// The plugin is built for the base item type; the cast hands the consumer a generic component, so
// `<DataGridRowClickPlugin<User> click={(user) => ...} />` types the callback's argument.
export const DataGridRowClickPlugin = DataGridRowClickPluginRaw as <
  TItem extends DataGridItem = DataGridItem,
>(
  props: DataGridRowClickPluginProps<TItem>,
) => ReactNode;
