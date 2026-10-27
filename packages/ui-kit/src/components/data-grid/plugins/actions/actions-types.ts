import type { ComponentType } from 'react';
import type { DataGridPluginApi } from '../../services/plugins/plugins-helpers';

export interface DataGridActionsPluginProps extends Record<string, unknown> {
  component: ComponentType;
  props?: Record<string, unknown>;
}

export interface DataGridActionsPluginApi extends DataGridPluginApi<DataGridActionsPluginProps> {
  useComponent: () => ComponentType | null;
  useProps: () => Record<string, unknown> | undefined;
}
