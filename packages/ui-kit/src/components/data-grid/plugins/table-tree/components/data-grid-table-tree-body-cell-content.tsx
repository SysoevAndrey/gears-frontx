import type { DataGridItem } from '../../../data-grid-types';
import { useDataGrid } from '../../../services/core/data-grid-context';
import { DataGridBodyCellContent } from '../../../services/table/components/data-grid-body-cell-content';
import { useDataGridRecord } from '../../../services/table/data-grid-record-context';
import { useTableService } from '../../../services/table/table-context';
import type { DataGridTableColumn } from '../../../services/table/table-types';
import type { DataGridTableTreePluginApi } from '../table-tree-types';
import { DataGridTableTreeExpand } from './data-grid-table-tree-expand';
import styles from './data-grid-table-tree.module.css';

interface DataGridTableTreeBodyCellContentProps<TItem extends DataGridItem> {
  column: DataGridTableColumn<TItem>;
  item: TItem;
}

export function DataGridTableTreeBodyCellContent<TItem extends DataGridItem>({
  column,
  item,
}: DataGridTableTreeBodyCellContentProps<TItem>) {
  const grid = useDataGrid<TItem>();
  const record = useDataGridRecord<TItem>();
  const tableService = useTableService<TItem>();
  const treePlugin = grid.getPlugin<DataGridTableTreePluginApi<TItem>>('tableTree')!;
  const visibleColumns = tableService.useVisibleColumns();
  const isFirstColumn = visibleColumns[0]?.id === column.id;
  const isExpandable = treePlugin.useIsExpandable(record);
  const level = treePlugin.useLevel(record.section);

  if ((isExpandable || level > 0) && isFirstColumn) {
    return (
      <div className={styles.treeCellContent}>
        {level > 0 && (
          <div
            className={styles.indentSpacer}
            style={{ inlineSize: `calc(var(--_data-grid-table-tree-indent) * ${level})` }}
          />
        )}
        {isExpandable && <DataGridTableTreeExpand />}
        <div className={styles.label}>
          <DataGridBodyCellContent column={column} item={item} />
        </div>
      </div>
    );
  }

  return <DataGridBodyCellContent column={column} item={item} />;
}
