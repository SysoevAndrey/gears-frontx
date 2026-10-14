import type { DataGridTreeItem } from '../../../tree-structure/tree-structure-types';
import type { TreeInternalContext, TreeConfig } from '../../tree-types';
import type { TreeSettingsPublicApi, TreeSettingsService } from './settings-types';

export function createSettingsService<TItem extends DataGridTreeItem>(
  context: TreeInternalContext<TItem>,
  config: TreeConfig<TItem>,
): TreeSettingsService<TItem> {
  const settings: TreeSettingsPublicApi<TItem>['settings'] = {
    ...config,
  };

  const publicApi: TreeSettingsPublicApi<TItem> = {
    settings,
    treeStructure: config.treeStructure,
  };

  context.plugins.registerPublicApi(publicApi);

  return settings;
}
