import type { ComponentType } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { ComponentsStackService } from '../../../utils/components-stack';
import type {
  DataGridTreeItem,
  DataGridTreeItemId,
  DataGridTreeNode,
} from '../../../tree-structure/tree-structure-types';

// Slot component props
export interface TreeLayoutSlotLeftProps<TItem extends DataGridTreeItem> {
  item: TItem;
  node: DataGridTreeNode<TItem>;
}

export interface TreeLayoutSlotActionsProps<TItem extends DataGridTreeItem> {
  item: TItem;
}

export interface TreeLayoutSlotLabelProps<TItem extends DataGridTreeItem> {
  item: TItem;
  label: string;
}

export interface TreeLayoutSlotPlaceholderProps<TItem extends DataGridTreeItem> {
  parent: TItem | null;
}

// Global bottom slot (no props - used for tree footer)
export type TreeLayoutSlotBottomProps = Record<string, never>;

export interface TreeLayoutSlotDirectoryBottomProps<TItem extends DataGridTreeItem> {
  node: DataGridTreeNode<TItem>;
}

export interface TreeLayoutSlotIconProps<TItem extends DataGridTreeItem> {
  item: TItem;
  expanded: boolean;
}

// Slot definitions
export interface TreeLayoutSlotBase<Name extends string> {
  id: string;
  name: Name;
  order: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a slot component takes the props of its slot and the tree's item type, which the stored form cannot name for every slot at once
  component: ComponentType<any>;
}

export type TreeLayoutSlot =
  | TreeLayoutSlotBase<'left'>
  | TreeLayoutSlotBase<'actions'>
  | TreeLayoutSlotBase<'label'>
  | TreeLayoutSlotBase<'placeholder'>
  | TreeLayoutSlotBase<'bottom'>
  | TreeLayoutSlotBase<'directory-bottom'>
  | TreeLayoutSlotBase<'icon'>;

/**
 * Layout slot names for the tree.
 *
 * - `'left'` - Left side of the node (e.g., checkbox)
 * - `'icon'` - Node icon
 * - `'label'` - Node label
 * - `'actions'` - Actions on the right side
 * - `'bottom'` - Content below the node
 * - `'placeholder'` - Placeholder when tree is empty
 * - `'directory-bottom'` - Content below directory nodes
 */
export type TreeLayoutSlotName = TreeLayoutSlot['name'];

// Slot registration options
export interface TreeLayoutSlotOptions<TItem extends DataGridTreeItem> {
  left: { component: ComponentType<TreeLayoutSlotLeftProps<TItem>> };
  actions: { component: ComponentType<TreeLayoutSlotActionsProps<TItem>> };
  label: { component: ComponentType<TreeLayoutSlotLabelProps<TItem>> };
  placeholder: { component: ComponentType<TreeLayoutSlotPlaceholderProps<TItem>> };
  bottom: { component: ComponentType<TreeLayoutSlotBottomProps> };
  'directory-bottom': { component: ComponentType<TreeLayoutSlotDirectoryBottomProps<TItem>> };
  icon: { component: ComponentType<TreeLayoutSlotIconProps<TItem>> };
}

// Component stack types
export type TreeLayoutComponentName = 'leaf' | 'directory' | 'placeholder';

export type TreeLayoutComponentStacks = Record<TreeLayoutComponentName, ComponentsStackService>;

// Store state
export interface TreeLayoutStore {
  slots: Map<TreeLayoutSlotName, TreeLayoutSlot[]>;
  expandedIds: Set<DataGridTreeItemId>;
  activeIds: Set<DataGridTreeItemId>;
  filter?: (item: DataGridTreeItem) => boolean;
}

// Public API
export interface TreeLayoutPublicApi<TItem extends DataGridTreeItem = DataGridTreeItem> {
  /**
   * Register a component in a layout slot.
   *
   * @param name - The slot name to register the component in
   * @param options - Configuration for the slot component
   * @returns Unregister function
   */
  registerSlot: <T extends TreeLayoutSlotName>(
    name: T,
    options: TreeLayoutSlotOptions<TItem>[T],
  ) => () => void;

  /**
   * Register a component wrapper in the component stack.
   * Allows plugins to wrap base components (e.g., drag-drop wrapping leaf components).
   *
   * @param name - Component type to wrap ('leaf', 'directory', 'placeholder')
   * @param component - Wrapper component
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a wrapper takes the props of the row component it wraps, which differ for each name
  registerComponent: (name: TreeLayoutComponentName, component: ComponentType<any>) => void;

  /**
   * Toggle node expanded state.
   *
   * @param id - Node ID
   * @param state - Optional explicit state
   */
  toggleExpanded: (id: DataGridTreeItemId, state?: boolean) => void;

  /**
   * Toggle node active state.
   *
   * @param id - Node ID
   * @param state - Optional explicit state
   */
  toggleActive: (id: DataGridTreeItemId, state?: boolean) => void;

  /**
   * Clear all active nodes.
   */
  clearActive: () => void;

  /**
   * Set filter function. Triggers re-render of filtered nodes.
   */
  setFilter: (filter?: (item: TItem) => boolean) => void;
}

export interface TreeLayoutService<
  TItem extends DataGridTreeItem = DataGridTreeItem,
> extends TreeLayoutPublicApi<TItem> {
  useLayoutStore: UseBoundStore<StoreApi<TreeLayoutStore>>;
  useSlots: <T extends TreeLayoutSlotName>(name: T) => Extract<TreeLayoutSlot, { name: T }>[];
  useComponent: <TProps = unknown>(name: TreeLayoutComponentName) => ComponentType<TProps>;
}
