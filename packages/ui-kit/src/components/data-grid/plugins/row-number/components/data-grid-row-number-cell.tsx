import { useDataGrid } from '../../../services/core/data-grid-context';
import { useDataGridRecord } from '../../../services/table/data-grid-record-context';
import type { DataGridRowNumberPluginApi } from '../row-number-types';
import { computeRowNumber } from '../services/row-number-formula';
import styles from './data-grid-row-number-cell.module.css';

export function DataGridRowNumberCell() {
  const grid = useDataGrid();
  const record = useDataGridRecord();

  const { measureRef } = grid.getPlugin<DataGridRowNumberPluginApi>('rowNumber')!;

  const page = record.section.loadContext.pagination?.page ?? 1;
  const limit = record.section.loadContext.pagination?.limit ?? 0;
  const rowNumber = computeRowNumber(record.index, page, limit);

  return (
    <span ref={measureRef} className={styles.rowNumber}>
      {rowNumber}
    </span>
  );
}
