// Load-bearing: a plugin is rendered as a child of <DataGrid>, so a Server Component can import
// and render it, and the component it returns calls hooks. This directive puts the banner on the
// plugin's own entry chunk (dist/data-grid/<plugin>.js). client-boundaries.test.ts only scans a
// component's top-level files, so scripts/verify-consumer.sh is what checks the built banner of
// every plugin entry.
'use client';

import type { DataGridItem } from '../../data-grid-types';
import { createDataGridPlugin } from '../../services/plugins/plugins-helpers';
import { DataGridTableConfigurationTrigger } from './components/data-grid-table-configuration-trigger';

/** The plugin takes no props; the type is public so a consumer can name it. */
export type DataGridTableConfigurationPluginProps = Record<string, never>;

export const DataGridTableConfigurationPlugin = createDataGridPlugin<
  DataGridItem,
  'tableConfiguration',
  DataGridTableConfigurationPluginProps
>('tableConfiguration', (context) => {
  context.registerSlot('top-end', {
    id: 'tableConfiguration',
    component: DataGridTableConfigurationTrigger,
    order: 10,
  });

  return {};
});
