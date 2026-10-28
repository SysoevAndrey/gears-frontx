import type { DataGridPluginApi } from '../../services/plugins/plugins-helpers';

export interface DataGridRowNumberPluginApi extends DataGridPluginApi {
  columnId: string;
  measureRef: (element: HTMLElement | null) => void;
}
