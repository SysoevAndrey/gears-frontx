import type { ComponentType } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createComponentsStack } from '../../../utils/components-stack';
import type {
  DataGridTreeItem,
  DataGridTreeItemId,
} from '../../../tree-structure/tree-structure-types';
import { TreeListItem } from '../../components/tree-list-item';
import { TreePlaceholder } from '../../components/tree-placeholder';
import type { TreeInternalContext } from '../../tree-types';
import type {
  TreeLayoutPublicApi,
  TreeLayoutService,
  TreeLayoutStore,
  TreeLayoutComponentName,
  TreeLayoutComponentStacks,
  TreeLayoutSlot,
  TreeLayoutSlotName,
  TreeLayoutSlotOptions,
} from './layout-types';

export function createLayoutService<TItem extends DataGridTreeItem>(
  context: TreeInternalContext<TItem>,
): TreeLayoutService<TItem> {
  const emptySlots: TreeLayoutSlot[] = [];

  const useLayoutStore = create<TreeLayoutStore>()(() => ({
    slots: new Map(),
    expandedIds: new Set(),
    activeIds: new Set(),
  }));

  const useComponentStackStore = create<TreeLayoutComponentStacks>(() => ({
    leaf: createComponentsStack(TreeListItem),
    directory: createComponentsStack(TreeListItem),
    placeholder: createComponentsStack(TreePlaceholder),
  }));

  const publicApi: TreeLayoutPublicApi<TItem> = {
    registerSlot,
    registerComponent,
    toggleExpanded,
    toggleActive,
    clearActive,
    setFilter,
  };

  context.plugins.registerPublicApi(publicApi);

  return {
    ...publicApi,
    useLayoutStore,
    useSlots,
    useComponent,
  };

  function getSlots<T extends TreeLayoutSlotName>(name: T) {
    return (useLayoutStore.getState().slots.get(name) ?? emptySlots) as Extract<
      TreeLayoutSlot,
      { name: T }
    >[];
  }

  function useSlots<T extends TreeLayoutSlotName>(name: T) {
    return useLayoutStore(
      useShallow(
        (state) => (state.slots.get(name) ?? emptySlots) as Extract<TreeLayoutSlot, { name: T }>[],
      ),
    );
  }

  function useComponent<TProps = unknown>(name: TreeLayoutComponentName) {
    return useComponentStackStore(() => {
      const stack = useComponentStackStore.getState()[name];
      return stack.getStackedComponent<TProps>();
    });
  }

  function registerSlot<T extends TreeLayoutSlotName>(
    name: T,
    options: TreeLayoutSlotOptions<TItem>[T],
  ) {
    const id = Math.random().toString();
    const existingSlots = getSlots(name);
    const order = (existingSlots.length + 1) * 10;
    const newSlot: TreeLayoutSlot = { id, name, ...options, order };
    const newSlots = [...existingSlots, newSlot];

    useLayoutStore.setState((state) => {
      const newSlotsMap = new Map(state.slots);
      newSlotsMap.set(name, newSlots);
      return { slots: newSlotsMap };
    });

    return () => unregisterSlot(name, id);
  }

  function unregisterSlot<T extends TreeLayoutSlotName>(name: T, id: string) {
    const existingSlots = getSlots(name);

    if (!existingSlots.length) return;

    const filtered = existingSlots.filter((slot) => slot.id !== id);

    useLayoutStore.setState((state) => {
      const newSlotsMap = new Map(state.slots);
      if (filtered.length) {
        newSlotsMap.set(name, filtered);
      } else {
        newSlotsMap.delete(name);
      }
      return { slots: newSlotsMap };
    });
  }

  function toggleExpanded(id: DataGridTreeItemId, state?: boolean) {
    useLayoutStore.setState((prevState) => {
      const expanded = prevState.expandedIds.has(id);
      const newState = state ?? !expanded;
      const newExpandedIds = new Set(prevState.expandedIds);

      if (newState !== expanded) {
        if (newState) {
          newExpandedIds.add(id);
        } else {
          newExpandedIds.delete(id);
        }
      }

      return { expandedIds: newExpandedIds };
    });
  }

  function toggleActive(id: DataGridTreeItemId, state?: boolean) {
    useLayoutStore.setState((prevState) => {
      const active = prevState.activeIds.has(id);
      const newState = state ?? !active;
      const newActiveIds = new Set(prevState.activeIds);

      if (newState !== active) {
        if (newState) {
          newActiveIds.add(id);
        } else {
          newActiveIds.delete(id);
        }
      }

      return { activeIds: newActiveIds };
    });
  }

  function clearActive() {
    useLayoutStore.setState({ activeIds: new Set() });
  }

  function setFilter(filter?: (item: TItem) => boolean) {
    useLayoutStore.setState({
      filter: filter as ((item: DataGridTreeItem) => boolean) | undefined,
    });
  }

  function registerComponent(name: TreeLayoutComponentName, component: ComponentType) {
    const stack = useComponentStackStore.getState()[name];
    stack.registerComponent(component);
  }
}
