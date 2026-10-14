import type { DataGridTreeItem } from '../tree-structure/tree-structure-types';
import { createFocusService } from './services/focus/focus-service';
import { createHookedService } from './services/hooked/hooked';
import { internalContextKey } from './services/internal/internal-helpers';
import { createLayoutService } from './services/layout/layout-service';
import { createPluginsService } from './services/plugins/plugins-service';
import type { TreePlugin } from './services/plugins/plugins-types';
import { createSettingsService } from './services/settings/settings-service';
import type { TreeInternalContext, TreeInstance, TreeConfig } from './tree-types';

export function createTree<
  TItem extends DataGridTreeItem,
  TPlugins extends TreePlugin<TItem>[] = TreePlugin<TItem>[],
>(config: TreeConfig<TItem>): TreeInstance<TItem, TPlugins> {
  const hooked = createHookedService();

  // The services are created one after another, and each registers its public API on the plugins
  // service while it is created. So the context hands out a service through a getter that fails
  // loudly if it is read before that service exists, instead of a placeholder object.
  const services: Partial<Omit<TreeInternalContext<TItem>, 'hooked'>> = {};

  const context: TreeInternalContext<TItem> = {
    hooked,
    get plugins() {
      return created(services.plugins, 'plugins');
    },
    get layout() {
      return created(services.layout, 'layout');
    },
    get settings() {
      return created(services.settings, 'settings');
    },
    get focus() {
      return created(services.focus, 'focus');
    },
  };

  services.plugins = createPluginsService<TItem>(context);
  services.settings = createSettingsService<TItem>(context, config);
  services.layout = createLayoutService<TItem>(context);
  services.focus = createFocusService<TItem>(context);

  // Public APIs are registered by services themselves

  return {
    init,
    destroy,
    ...context.plugins.pluginContext,
    [internalContextKey]: context,
  } as TreeInstance<TItem, TPlugins>;

  function destroy() {
    hooked.callHookSync('destroy');
  }

  async function init() {
    await hooked.callHook('init');
  }
}

function created<T>(service: T | undefined, name: string): T {
  if (service === undefined) {
    throw new Error(`[DataGridTree] The ${name} service was used before it was created.`);
  }
  return service;
}
