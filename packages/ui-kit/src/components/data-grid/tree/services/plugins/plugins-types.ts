import type {
  DataGridTreeItem,
  DataGridTreeNode,
} from '../../../tree-structure/tree-structure-types';
import type { TreeFocusPublicApi } from '../focus/focus-types';
import type { TreeHooked } from '../hooked/hooked-types';
import type { TreeLayoutPublicApi } from '../layout/layout-types';
import type { TreeSettingsPublicApi } from '../settings/settings-types';

/**
 * Node context provided to tree components.
 * Includes node data and API methods for interaction.
 */
export interface TreeNodeContext<TItem extends DataGridTreeItem = DataGridTreeItem> {
  node: DataGridTreeNode<TItem>;
  item: TItem;
}

export interface TreePluginsPublicApi {
  /**
   * Register a lifecycle hook handler.
   *
   * @param name - Hook name (e.g., 'init', 'destroy')
   * @param handler - Handler function to execute when hook is called
   */
  hook: TreeHooked['hook'];

  /**
   * Access another plugin's API.
   *
   * @param name - Plugin name
   * @returns The plugin's public API or undefined if not found
   */
  getPlugin: <TApi>(name: string) => TApi | undefined;
}

export type TreeServicesPublicApiTypes<TItem extends DataGridTreeItem> =
  | TreeLayoutPublicApi<TItem>
  | TreePluginsPublicApi
  | TreeSettingsPublicApi<TItem>
  | TreeFocusPublicApi;

export interface TreePluginContext<TItem extends DataGridTreeItem>
  extends
    TreeLayoutPublicApi<TItem>,
    TreePluginsPublicApi,
    TreeSettingsPublicApi<TItem>,
    TreeFocusPublicApi {}

export interface TreePlugin<
  TItem extends DataGridTreeItem = DataGridTreeItem,
  TName extends string = string,
  TApi = void,
> {
  name: TName;
  setup: (context: TreePluginContext<TItem>) => TApi;
}

export interface TreePluginsService<TItem extends DataGridTreeItem> extends TreePluginsPublicApi {
  registerPlugin: (plugin: TreePlugin<TItem>) => void;
  registerPlugins: (plugins: TreePlugin<TItem>[]) => void;
  registerPublicApi: (methods: TreeServicesPublicApiTypes<TItem>) => void;
  pluginContext: TreePluginContext<TItem>;
}
