import { Checkbox } from '../../../../checkbox/public.js';
import { useDataGrid } from '../../../services/core/data-grid-context';
import { useDataGridRecord } from '../../../services/table/data-grid-record-context';
import type { DataGridRowSelectPluginApi } from '../row-select-types';
import styles from './data-grid-row-select-body.module.css';

export function DataGridRowSelectBody() {
  const grid = useDataGrid();
  const record = useDataGridRecord();
  const rowSelect = grid.getPlugin<DataGridRowSelectPluginApi>('rowSelect')!;

  const isVisible = rowSelect.useIsVisible(record.item);
  const isSelected = rowSelect.useIsSelected(record.id);

  if (!isVisible) return null;

  return (
    <div className={styles.cell}>
      <Checkbox checked={isSelected} onCheckedChange={() => rowSelect.toggleSelection(record.id)} />
    </div>
  );
}
