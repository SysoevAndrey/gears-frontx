// Load-bearing: a plugin is rendered as a child of <DataGrid>, so a Server Component can import
// and render it, and the component it returns calls hooks. This directive puts the banner on the
// plugin's own entry chunk (dist/data-grid/<plugin>.js). client-boundaries.test.ts only scans a
// component's top-level files, so scripts/verify-consumer.sh is what checks the built banner of
// every plugin entry.
'use client';

import type { DataGridItem } from '../../data-grid-types';
import { createColumnAutoSize } from '../../services/columns/create-column-auto-size';
import { createDataGridPlugin } from '../../services/plugins/plugins-helpers';
import { DataGridRowNumberCell } from './components/data-grid-row-number-cell';
import type { DataGridRowNumberPluginApi } from './row-number-types';

const rowNumberColumnId = 'row-number';
const rowNumberInitialWidth = '32px';

export type { DataGridRowNumberPluginApi };

export const DataGridRowNumberPlugin = createDataGridPlugin<DataGridItem, 'rowNumber'>(
  'rowNumber',
  (context) => {
    const columnId = rowNumberColumnId;

    const { measureRef, destroy } = createColumnAutoSize((width) => {
      context.updateExtraColumnWidth(columnId, width);
    });

    context.hook('destroy', destroy);

    context.registerExtraColumn({
      id: columnId,
      position: 'start',
      order: 3,
      body: DataGridRowNumberCell,
      width: rowNumberInitialWidth,
    });

    const api: DataGridRowNumberPluginApi = {
      columnId,
      measureRef,
    };

    return api;
  },
);
