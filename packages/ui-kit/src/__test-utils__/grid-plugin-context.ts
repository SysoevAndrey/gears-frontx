import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { DataGrid } from '../components/data-grid/data-grid';
import type { DataGridItem, DataGridLoadResult } from '../components/data-grid/data-grid-types';
import { useDataGridPluginContext } from '../components/data-grid/services/core/data-grid-context';
import type { DataGridPluginContext } from '../components/data-grid/services/plugins/plugins-types';

let renderedGrids = 0;

/**
 * The plugin context of a grid that has really rendered, for a test of code that takes one and
 * would otherwise be handed an empty object cast to the type. The grid holds `rows`, at least one
 * because a grid with none renders no table, and nothing else; it stays mounted until Testing
 * Library's cleanup.
 */
export async function createGridPluginContext<Item extends DataGridItem>(
  rows: [Item, ...Item[]],
): Promise<DataGridPluginContext<Item>> {
  let captured: DataGridPluginContext<Item> | undefined;

  function Probe() {
    captured = useDataGridPluginContext<Item>();
    return null;
  }

  renderedGrids += 1;
  render(
    createElement(
      DataGrid<Item>,
      {
        name: `grid_plugin_context_${renderedGrids}`,
        persistent: 'memory',
        load: (): Promise<DataGridLoadResult<Item>> =>
          Promise.resolve({ results: rows, total: rows.length }),
        columns: [{ id: 'id', label: 'Id' }],
      },
      createElement(Probe),
    ),
  );
  await screen.findByRole('table');

  if (!captured) throw new Error('The grid did not render its children');
  return captured;
}
