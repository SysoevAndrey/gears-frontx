import type { ReactNode, RefObject } from 'react';
import type {
  DataGridTreeItem,
  DataGridTreeStructure,
} from '../tree-structure/tree-structure-types';
import type { TreeFocusService } from './services/focus/focus-types';
import type { TreeHooked } from './services/hooked/hooked-types';
import type { internalContextKey } from './services/internal/internal-helpers';
import type { TreeLayoutService } from './services/layout/layout-types';
import type {
  TreePluginsService,
  TreePlugin,
  TreePluginContext,
} from './services/plugins/plugins-types';
import type { TreeSettings, TreeSettingsService } from './services/settings/settings-types';

/**
 * Tree configuration
 */
export interface TreeConfig<TItem extends DataGridTreeItem> extends Omit<
  TreeSettings<TItem>,
  'treeStructure'
> {
  name: string;
  treeStructure: RefObject<DataGridTreeStructure<TItem>>;
}

/**
 * Tree component props
 */
export interface TreeProps<TItem extends DataGridTreeItem> extends TreeSettings<TItem> {
  name: string;
  children?: ReactNode;
}

/**
 * Internal context passed to services and plugins
 */
export interface TreeInternalContext<TItem extends DataGridTreeItem> {
  hooked: TreeHooked;
  plugins: TreePluginsService<TItem>;
  layout: TreeLayoutService<TItem>;
  settings: TreeSettingsService<TItem>;
  focus: TreeFocusService;
}

/**
 * Tree instance
 */
export interface TreeInstance<
  TItem extends DataGridTreeItem,
  TPlugins extends TreePlugin<TItem>[] = TreePlugin<TItem>[],
> extends Omit<TreePluginContext<TItem>, 'getPlugin'> {
  init: () => Promise<void>;
  destroy: () => void;
  getPlugin: (<TApi>(name: string) => TApi | undefined) &
    (<TName extends TPlugins[number]['name']>(
      name: TName,
    ) => ReturnType<Extract<TPlugins[number], { name: TName }>['setup']>);
  [internalContextKey]: TreeInternalContext<TItem>;
}
