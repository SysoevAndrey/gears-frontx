import { Checkbox } from '../../../../checkbox/public.js';
import { useDataGrid } from '../../../services/core/data-grid-context';
import type { DataGridRowSelectPluginApi } from '../row-select-types';

export function DataGridRowSelectHeader() {
  const grid = useDataGrid();
  const rowSelect = grid.getPlugin<DataGridRowSelectPluginApi>('rowSelect')!;

  const multiple = rowSelect.useMultiple();
  const showSelectAll = rowSelect.useShowSelectAll();
  const isAllSelected = rowSelect.useIsAllSelected();
  const isPartialSelected = rowSelect.useIsPartialSelected();

  if (!multiple || !showSelectAll) return null;

  return (
    <Checkbox
      checked={isAllSelected}
      indeterminate={isPartialSelected}
      onCheckedChange={rowSelect.toggleSelectAll}
    />
  );
}
