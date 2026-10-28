import { cx } from 'class-variance-authority';

import { DropdownMenuItem } from '../../../../dropdown-menu/public.js';
import { Switch } from '../../../../switch/public.js';
import type { ConfigurationColumn } from '../../../services/table/table-types';
import styles from './data-grid-table-configuration.module.css';
import { DataGridTableConfigurationPinButton } from './data-grid-table-configuration-pin-button';

interface DataGridTableConfigurationItemProps {
  column: ConfigurationColumn;
  hasSticky?: boolean;
  onVisibilityToggle: (columnId: string, visible: boolean) => void;
  onStickyToggle: (columnId: string, sticky: boolean) => void;
}

export function DataGridTableConfigurationItem({
  column,
  hasSticky,
  onVisibilityToggle,
  onStickyToggle,
}: DataGridTableConfigurationItemProps) {
  function handleVisibilityToggle(visible: boolean) {
    onVisibilityToggle(column.id, visible);
  }

  function handleStickyToggle() {
    onStickyToggle(column.id, !column.sticky);
  }

  // The item holds a switch and a pin button, both interactive: a menu item is the row they sit
  // in, not something to activate itself.
  return (
    <DropdownMenuItem
      className={cx(styles.configurationItem, !hasSticky && styles.configurationItemNoSticky)}
    >
      {hasSticky && (
        <DataGridTableConfigurationPinButton sticky={column.sticky} onToggle={handleStickyToggle} />
      )}
      <span className={styles.label}>{column.label}</span>
      <Switch
        size="sm"
        checked={column.visible}
        disabled={column.visibleToggleDisabled}
        onCheckedChange={handleVisibilityToggle}
      />
    </DropdownMenuItem>
  );
}
