import { cx } from 'class-variance-authority';
import type { KeyboardEvent } from 'react';
import { TableRow } from '../../../../table/public.js';
import type { DataGridItem } from '../../../data-grid-types';
import { useDataGridContext } from '../../../services/core/data-grid-context';
import type { DataGridRecord } from '../../../services/storage/storage-types';
import { DataGridCell } from '../../../services/table/components/data-grid-cell';
import { DataGridExtraBodyColumns } from '../../../services/table/components/data-grid-extra-body-columns';
import { DataGridTableRecords } from '../../../services/table/components/data-grid-table-records';
import { DataGridRecordProvider } from '../../../services/table/data-grid-record-context';
import { resolveBodyCellProps } from '../../../services/table/resolve-body-cell-props';
import type { DataGridTableColumn } from '../../../services/table/table-types';
import type { DataGridRowClickPluginApi } from '../../row-click/row-click-plugin';
import { getClickListener } from '../../row-click/row-click-utils';
import type { DataGridTableTreePluginApi } from '../table-tree-types';
import styles from './data-grid-table-tree.module.css';

interface DataGridTableTreeRowProps<TItem extends DataGridItem> {
  record: DataGridRecord<TItem>;
}

export function DataGridTableTreeRow<TItem extends DataGridItem>({
  record,
}: DataGridTableTreeRowProps<TItem>) {
  const context = useDataGridContext<TItem>();
  const tableService = context.table;
  const columns = tableService.useVisibleColumns();
  const tableLayout = tableService.useTableLayout();
  const treePlugin = context.plugins.getPlugin<DataGridTableTreePluginApi<TItem>>('tableTree')!;
  const rowClickApi = context.plugins.getPlugin<DataGridRowClickPluginApi<TItem>>('rowClick');
  const isExpanded = treePlugin.useIsExpanded(record.id);
  const isExpandable = treePlugin.useIsExpandable(record);
  const childRecords = context.storage.getRecordsByParentId(record.id);

  const BodyCellContent = tableService.useComponent<{
    column: DataGridTableColumn<TItem>;
    item: TItem;
  }>('body-cell-content');

  // This row replaces the row-click plugin's, so it has to do what that row does when the plugin
  // is registered.
  const hasRowClick = !!rowClickApi;
  const onClick = hasRowClick ? getClickListener(record.item, () => rowClickApi?.click) : undefined;
  const onDblClick = hasRowClick
    ? getClickListener(record.item, () => rowClickApi?.dblclick)
    : undefined;
  const onKeyDown = hasRowClick
    ? (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          onClick?.(event);
        }
      }
    : undefined;

  return (
    <DataGridRecordProvider value={record}>
      <TableRow
        className={hasRowClick ? styles.clickableRow : undefined}
        tabIndex={hasRowClick ? 0 : undefined}
        onClick={onClick}
        onDoubleClick={onDblClick}
        onKeyDown={onKeyDown}
      >
        <DataGridExtraBodyColumns position="start" />
        {columns.map((col, index) => {
          const dynamicClassName = col.getClassName?.(record.item);
          const bodyCellProps = resolveBodyCellProps(col, record.item, tableLayout);
          // The toggle is a control tall, so the first cell of a row that holds one gives up the
          // block padding that makes the row a line of text high, and the row stays that high.
          const holdsToggle = index === 0 && isExpandable;

          return (
            <DataGridCell<TItem>
              key={col.id}
              columnId={col.id}
              className={cx(holdsToggle && styles.toggleCell, dynamicClassName)}
              {...bodyCellProps}
            >
              <BodyCellContent column={col} item={record.item} />
            </DataGridCell>
          );
        })}
        <DataGridExtraBodyColumns position="end" />
      </TableRow>
      {isExpanded && childRecords.length > 0 && (
        <DataGridTableRecords<TItem> records={childRecords} />
      )}
    </DataGridRecordProvider>
  );
}
