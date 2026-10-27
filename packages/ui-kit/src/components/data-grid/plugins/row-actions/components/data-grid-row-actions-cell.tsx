import { cx } from 'class-variance-authority';
import { useDataGrid } from '../../../services/core/data-grid-context';
import { IGNORE_CLICK_ATTRIBUTE } from '../../../services/table/ignore-row-click';
import { useDataGridRecord } from '../../../services/table/data-grid-record-context';
import type { DataGridRowActionsPluginApi } from '../row-actions-types';
import styles from './data-grid-row-actions-cell.module.css';

export function DataGridRowActionsCell() {
  const grid = useDataGrid();
  const record = useDataGridRecord();

  const { measureRef, useComponent, useClassName } =
    grid.getPlugin<DataGridRowActionsPluginApi>('rowActions')!;
  const ContentComponent = useComponent();
  const className = useClassName();

  if (!ContentComponent) {
    return null;
  }

  return (
    <div
      ref={measureRef}
      className={cx(styles.rowActions, className)}
      {...{ [IGNORE_CLICK_ATTRIBUTE]: '' }}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- ContentComponent is the consumer's component held in the plugin's store, so it is the same component on every render; the rule cannot see through the store. */}
      <ContentComponent item={record.item} />
    </div>
  );
}
