import type { RefObject } from 'react';
import type {
  DataGridTreeItem,
  DataGridTreeStructure,
} from '../../../tree-structure/tree-structure-types';
import type { TreeConfig } from '../../tree-types';
import type { TreeNodeContext } from '../plugins/plugins-types';

export type TreeSettingsClickCallback<TItem extends DataGridTreeItem = DataGridTreeItem> = (node: {
  id: string | number;
  item: TItem;
}) => void;

export type TreeLabel<TItem extends DataGridTreeItem> =
  (keyof TItem & string) | ((item: TItem) => string);

export type TreeDirectoryBottomShowOption = boolean | 'when_expanded';

export type TreeActionsShowOption = boolean | 'when_hover';

/**
 * Tree settings configuration
 */
export interface TreeSettings<TItem extends DataGridTreeItem> {
  /**
   * Make the whole node as "button" and attach click listeners
   * Use with caution! If you have active elements inside, you should not pass it
   */
  click?: TreeSettingsClickCallback<TItem>;

  /** Tree data structure with operations (REQUIRED) */
  treeStructure: DataGridTreeStructure<TItem>;

  /** Ellipsis option passed to list item (optional) */
  ellipsis?: boolean;

  /**
   * Whether to show inline start slot or not
   * @default 'leaf'
   */
  showInlineStart?: 'leaf' | 'directory' | ((item: TItem) => boolean);

  /**
   * When to show directory-bottom slot
   * - true: show for all directories
   * - false: never show
   * - 'when_expanded': show only for expanded directories
   */
  showDirectoryBottom?: (item: TItem, ctx: TreeNodeContext<TItem>) => TreeDirectoryBottomShowOption;

  /**
   * When to show actions slot
   * - true: show always
   * - false: never show
   * - 'when_hover': show only on hover
   */
  showActions?: (item: TItem, ctx: TreeNodeContext<TItem>) => TreeActionsShowOption;

  /**
   * Get value from node and format it (REQUIRED)
   * Can be property name (keyof Item & string) or function
   */
  label: TreeLabel<TItem>;

  /**
   * Filter items for display. Return true to show item, false to hide.
   * This is for visual filtering only and doesn't mutate the underlying data.
   */
  filter?: (item: TItem) => boolean;

  /**
   * Node ID to focus on mount. If not provided, focus is determined automatically
   * based on selection state.
   */
  initialFocusedNodeId?: string | number;

  /**
   * Accessible label for the tree. Provides a name for screen readers.
   */
  ariaLabel?: string;

  /**
   * ID of element that labels the tree. Alternative to ariaLabel.
   */
  ariaLabelledBy?: string;
}

export interface TreeSettingsPublicApi<TItem extends DataGridTreeItem> {
  settings: TreeConfig<TItem>;
  treeStructure: RefObject<DataGridTreeStructure<TItem>>;
}

export type TreeSettingsService<TItem extends DataGridTreeItem> = TreeConfig<TItem>;
