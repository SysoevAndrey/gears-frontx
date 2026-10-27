import type { DataGridTreeItem } from '../../../tree-structure/tree-structure-types';
import type { TreeInternalContext } from '../../tree-types';
import type {
  TreePluginContext,
  TreePluginsPublicApi,
  TreePluginsService,
  TreeServicesPublicApiTypes,
  TreePlugin,
} from './plugins-types';

// Only the hook bus is read from the context: the services created after this one are not
// there yet.
export function createPluginsService<TItem extends DataGridTreeItem>(
  context: Pick<TreeInternalContext<TItem>, 'hooked'>,
): TreePluginsService<TItem> {
  const pluginApis = new Map<string, unknown>();
  const pluginPublicApi: TreePluginsPublicApi = {
    hook: context.hooked.hook,
    getPlugin,
  };

  // Starts with the plugins' own API and grows as every other service registers its public API
  // through `registerPublicApi` while the tree is being created. Plugins only see it afterwards,
  // when it is complete, which a type cannot express for an object filled in over time.
  const pluginContext = { ...pluginPublicApi } as TreePluginContext<TItem>;

  return {
    ...pluginPublicApi,
    registerPlugin,
    registerPlugins,
    registerPublicApi,
    pluginContext,
  };

  function registerPublicApi(methods: TreeServicesPublicApiTypes<TItem>) {
    Object.assign(pluginContext, methods);
  }

  function registerPlugin(plugin: TreePlugin<TItem>) {
    if (pluginApis.has(plugin.name)) {
      console.warn(
        `[DataGridTree] Plugin "${plugin.name}" is already registered — skipping duplicate registration.`,
      );
      return;
    }

    const api = plugin.setup(pluginContext);
    if (api !== undefined) {
      pluginApis.set(plugin.name, api);
    }
  }

  function registerPlugins(plugins: TreePlugin<TItem>[]) {
    plugins.forEach((plugin) => registerPlugin(plugin));
  }

  function getPlugin<TApi>(name: string): TApi | undefined {
    return pluginApis.get(name) as TApi | undefined;
  }
}
