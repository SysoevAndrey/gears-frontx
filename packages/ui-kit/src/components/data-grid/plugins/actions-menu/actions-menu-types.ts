import type { ComponentType } from 'react';
import type { DataGridPluginApi } from '../../services/plugins/plugins-helpers';

export interface DataGridActionsMenuItemOption<
  Params extends Record<string, unknown> = Record<string, unknown>,
> {
  order?: number;
  component: ComponentType<{ params?: Params }>;
  params?: Params;
}

export interface DataGridActionsMenuItem {
  id: string;
  order: number;
  component: ComponentType<{ params?: Record<string, unknown> }>;
  params?: Record<string, unknown>;
}

export interface DataGridActionsMenuPluginApi extends DataGridPluginApi<DataGridActionsMenuPluginProps> {
  registerMenuItem: (item: DataGridActionsMenuItemOption) => void;
  useMenuItems: () => DataGridActionsMenuItem[];
}

export interface DataGridActionsMenuPluginProps extends Record<string, unknown> {
  menuItems: DataGridActionsMenuItemOption[];
}
