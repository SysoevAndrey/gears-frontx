import { useDataGrid } from '../../../services/core/data-grid-context';
import type { DataGridActionsPluginApi } from '../actions-types';
import styles from './data-grid-actions-wrapper.module.css';

export function DataGridActionsWrapper() {
  const grid = useDataGrid();
  const actions = grid.getPlugin<DataGridActionsPluginApi>('actions')!;

  const ActionComponent = actions.useComponent();
  const actionProps = actions.useProps();

  if (!ActionComponent) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      {/* eslint-disable-next-line react-hooks/static-components -- ActionComponent is the consumer's component held in the plugin's store, so it is the same component on every render; the rule cannot see through the store. */}
      <ActionComponent {...actionProps} />
    </div>
  );
}
