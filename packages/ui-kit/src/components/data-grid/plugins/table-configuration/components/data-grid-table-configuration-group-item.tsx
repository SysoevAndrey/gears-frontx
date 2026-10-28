import { DropdownMenuItem } from '../../../../dropdown-menu/public.js';
import type { ConfigurationGroup } from '../../../services/table/table-types';
import styles from './data-grid-table-configuration.module.css';
import { DataGridTableConfigurationItem } from './data-grid-table-configuration-item';
import { DataGridTableConfigurationPinButton } from './data-grid-table-configuration-pin-button';

interface DataGridTableConfigurationGroupItemProps {
  group: ConfigurationGroup;
  hasSticky?: boolean;
  onVisibilityToggle: (columnId: string, visible: boolean) => void;
  onStickyToggle: (id: string, sticky: boolean) => void;
}

export function DataGridTableConfigurationGroupItem({
  group,
  hasSticky,
  onVisibilityToggle,
  onStickyToggle,
}: DataGridTableConfigurationGroupItemProps) {
  function handleStickyToggle() {
    onStickyToggle(group.id, !group.sticky);
  }

  return (
    <div>
      <DropdownMenuItem className={styles.configurationItem}>
        {hasSticky && (
          <DataGridTableConfigurationPinButton sticky={group.sticky} onToggle={handleStickyToggle} />
        )}
        <span className={styles.label}>{group.label}</span>
      </DropdownMenuItem>
      <div className={styles.groupContent}>
        {group.columns.map((col) => (
          <DataGridTableConfigurationItem
            key={col.id}
            column={col}
            onVisibilityToggle={onVisibilityToggle}
            onStickyToggle={onStickyToggle}
          />
        ))}
      </div>
    </div>
  );
}
