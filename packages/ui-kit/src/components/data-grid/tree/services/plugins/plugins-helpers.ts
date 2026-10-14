import { memo, useEffect, useState } from 'react';
import type { DataGridTreeItem } from '../../../tree-structure/tree-structure-types';
import { useTreeContext } from '../core/tree-context';
import type { TreePluginContext } from './plugins-types';

export interface PluginApi<TProps extends Record<string, unknown> = Record<string, unknown>> {
  onPropsChange?: (props: TProps) => void;
}

/**
 * Creates a Tree plugin as a React component.
 *
 * @param name - Unique plugin name for plugin identification
 * @param setup - Setup function that runs once on mount, returns plugin API
 * @param propsAreEqual - Optional comparison function for React.memo to control re-renders
 * @returns React component that accepts TProps and can be used as child of Tree
 *
 * @example
 * ```tsx
 * interface SelectPluginProps {
 *   initialSelectedIds?: string[];
 * }
 *
 * interface SelectPluginApi extends PluginApi<SelectPluginProps> {
 *   useSelectStore: UseBoundStore<StoreApi<{ selectedIds: Set<string> }>>;
 * }
 *
 * export const TreeNodeSelectPlugin = createTreePlugin<
 *   DataGridTreeItem,
 *   'nodeSelect',
 *   SelectPluginProps
 * >('nodeSelect', (context) => {
 *   const useSelectStore = create(() => ({ selectedIds: new Set() }));
 *
 *   context.registerSlot('left', {
 *     id: 'checkbox',
 *     component: CheckboxComponent,
 *   });
 *
 *   return {
 *     useSelectStore,
 *     onPropsChange,
 *   };
 *
 *   function onPropsChange(props: SelectPluginProps) {
 *     if (props.initialSelectedIds) {
 *       useSelectStore.setState({ selectedIds: new Set(props.initialSelectedIds) });
 *     }
 *   }
 * });
 * ```
 */
export function createTreePlugin<
  TItem extends DataGridTreeItem = DataGridTreeItem,
  TName extends string = string,
  TProps extends Record<string, unknown> = Record<string, unknown>,
  TApi extends PluginApi<TProps> = PluginApi<TProps>,
>(
  name: TName,
  setup: (context: TreePluginContext<TItem>) => TApi,
  propsAreEqual?: (prevProps: Readonly<TProps>, nextProps: Readonly<TProps>) => boolean,
) {
  return memo(function TreePlugin(props: TProps) {
    const context = useTreeContext<TItem>();

    const [api] = useState<TApi>(() => {
      const pluginApi = setup(context.plugins.pluginContext);
      context.plugins.registerPlugin({
        name,
        setup: () => pluginApi,
      });

      return pluginApi;
    });

    useEffect(() => {
      api.onPropsChange?.(props);
    }, [api, props]);

    return null;
  }, propsAreEqual);
}
