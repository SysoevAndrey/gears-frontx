import type { ComponentType } from 'react';
import type { DataGridItem } from '../../data-grid-types';
import type { DataGridPluginApi } from '../../services/plugins/plugins-helpers';

export interface DataGridRowActionsPluginProps<
  TItem extends DataGridItem = DataGridItem,
> extends Record<string, unknown> {
  component: ComponentType<{ item: TItem }>;
  order?: number;
  className?: string;
  /**
   * Pins the actions column to the table's inline-end edge, so the row menu stays reachable on a
   * table wide enough to scroll sideways instead of sitting past that edge.
   * @default false
   */
  sticky?: boolean;
}

export interface DataGridRowActionsPluginApi<
  TItem extends DataGridItem = DataGridItem,
> extends DataGridPluginApi<DataGridRowActionsPluginProps<TItem>> {
  useComponent: () => ComponentType<{ item: TItem }> | null;
  useClassName: () => string | undefined;
  measureRef: (element: HTMLElement | null) => void;
}
