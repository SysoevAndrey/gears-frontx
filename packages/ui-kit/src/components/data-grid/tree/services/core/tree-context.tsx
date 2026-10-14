import { createContext, useContext } from 'react';
import type { DataGridTreeItem } from '../../../tree-structure/tree-structure-types';
import type { TreeInternalContext, TreeInstance } from '../../tree-types';
import { internalContextKey } from '../internal/internal-helpers';
import type { TreePlugin, TreePluginContext } from '../plugins/plugins-types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TreeInstance is invariant in its item type (its internals take it in both positions), so the context holds the widest form and `useTree` hands it back as the caller's
const TreeContext = createContext<TreeInstance<any, any[]> | null>(null);

export const TreeProvider = TreeContext.Provider;

/**
 * @public
 */
export function useTree<
  TItem extends DataGridTreeItem = DataGridTreeItem,
  TPlugins extends TreePlugin<TItem>[] = TreePlugin<TItem>[],
>(): TreeInstance<TItem, TPlugins> {
  const tree = useContext(TreeContext);
  if (!tree) {
    throw new Error('useTree must be used within TreeProvider');
  }

  return tree;
}

/**
 * Hook for plugins to access public plugin context.
 * Provides access to plugin APIs, hooks, and layout registration.
 * @public
 */
export function useTreePluginContext<
  TItem extends DataGridTreeItem = DataGridTreeItem,
>(): TreePluginContext<TItem> {
  const context = useTreeContext<TItem>();

  return context.plugins.pluginContext;
}

/**
 * Hook for internal access to all tree services.
 * Not exported in public API - for internal use only.
 * @internal
 */
export function useTreeContext<
  TItem extends DataGridTreeItem = DataGridTreeItem,
>(): TreeInternalContext<TItem> {
  const tree = useTree<TItem>();

  return tree[internalContextKey];
}
