import type { ComponentType } from 'react';
import type { DataGridItem } from '../../data-grid-types';
import type { DataGridItemId } from '../../services/storage/storage-types';

/** A consumer component rendered into the row-select action bar, given the plugin API. */
type RowSelectSlotComponent<TItem extends DataGridItem = DataGridItem> = ComponentType<{
  rowSelect: DataGridRowSelectPluginApi<TItem>;
}>;

/** Effective selection state of the row-select plugin. */
export type DataGridRowSelectMode = 'none' | 'page' | 'all';

/**
 * Describes what a bulk action should operate on.
 *
 * In `'all-matching'` mode the consumer sends its active filter/query plus a
 * "select all matching" flag — never a materialised id list.
 */
export type DataGridRowSelectDescriptor =
  | { mode: 'ids'; ids: DataGridItemId[] }
  | { mode: 'all-matching' };

/** Metadata passed alongside the selected items to `onSelectionChange`. */
export interface DataGridRowSelectChangeMeta {
  /** The current selection mode. */
  mode: DataGridRowSelectMode;
  /** Effective count: total matching when `mode` is `'all'`, else selected-id count. */
  count: number;
}

export interface DataGridRowSelectPluginProps<
  TItem extends DataGridItem = DataGridItem,
> extends Record<string, unknown> {
  /** Custom component rendered in the action bar when rows are selected. */
  component?: RowSelectSlotComponent<TItem>;
  /**
   * Custom component that replaces the default "N items selected" indicator in
   * the action bar. Receives the plugin API so it can derive its own content
   * from the selection (e.g. computed capacities). When omitted the default
   * localized count is shown.
   */
  statusComponent?: RowSelectSlotComponent<TItem>;
  /** Called whenever the set of selected items changes. */
  onSelectionChange?: (selectedItems: TItem[], meta: DataGridRowSelectChangeMeta) => void;
  /** Allows selecting multiple rows simultaneously. Defaults to `true`. */
  multiple?: boolean;
  /** Predicate to hide the checkbox for specific rows. */
  visible?: (item: TItem) => boolean;
  /** Whether to show the per-page select-all checkbox in the header. Defaults to `true`. */
  showSelectAll?: boolean;
  /**
   * Opt in to the "Select all N" banner and all-matching mode. Defaults to
   * `false` — enable it only once the consumer handles the all-matching scope
   * via the `meta` argument of `onSelectionChange` or `getSelectionDescriptor()`
   * (in all-matching mode `selectedItems` only holds the current page). Also
   * requires an action `component` and a load result whose `total` exceeds the
   * number of rows on the current page.
   */
  showSelectAllMatching?: boolean;
  /**
   * When true, explicitly selected rows stay selected even when they are not
   * visible (filtered out, searched away, or on a different page) instead of
   * being pruned to the current page. `onSelectionChange` then reports every
   * selected item across pages, and the header select-all/indeterminate state
   * reflects the current page only. Defaults to `false`.
   *
   * Mutually exclusive in spirit with `showSelectAllMatching`: this keeps a
   * hand-picked cross-page set, that offers a single "all matching" scope.
   */
  keepHiddenSelection?: boolean;
}

export interface RowSelectStore {
  selectedIds: Set<DataGridItemId>;
  /** Whether all-matching mode is active (every record matching the active filter). */
  selectAllMatching: boolean;
  /** Total matching count, mirrored from the load result's `total`. */
  total: number;
}

export interface RowSelectConfigStore<TItem extends DataGridItem = DataGridItem> {
  multiple: boolean;
  showSelectAll: boolean;
  showSelectAllMatching: boolean;
  keepHiddenSelection: boolean;
  visible: ((item: TItem) => boolean) | undefined;
  onSelectionChange:
    | ((selectedItems: TItem[], meta: DataGridRowSelectChangeMeta) => void)
    | undefined;
  component: RowSelectSlotComponent<TItem> | undefined;
  statusComponent: RowSelectSlotComponent<TItem> | undefined;
}

export interface DataGridRowSelectPluginApi<TItem extends DataGridItem = DataGridItem> {
  useSelectedIds: () => Set<DataGridItemId>;
  useIsSelected: (itemId: DataGridItemId) => boolean;
  useMultiple: () => boolean;
  useShowSelectAll: () => boolean;
  useShowSelectAllMatching: () => boolean;
  useComponent: () => RowSelectSlotComponent<TItem> | undefined;
  useStatusComponent: () => RowSelectSlotComponent<TItem> | undefined;
  useIsAllSelected: () => boolean;
  useIsPartialSelected: () => boolean;
  useIsVisible: (item: TItem) => boolean;
  useIsSelectAllMatching: () => boolean;
  useSelectionMode: () => DataGridRowSelectMode;
  useSelectionCount: () => number;
  useTotalCount: () => number;
  /** Number of selectable (visible-predicate-passing) records on the current page. */
  useSelectableCount: () => number;
  /** Number of records loaded on the current page (ignores the `visible` predicate). */
  useVisibleCount: () => number;
  toggleSelection: (itemId: DataGridItemId) => void;
  clearSelection: () => void;
  toggleSelectAll: (value: boolean) => void;
  /** Enter all-matching mode (records intent; performs no id enumeration). */
  selectAllMatching: () => void;
  /** Describe what a bulk action should target: explicit ids or the whole matching set. */
  getSelectionDescriptor: () => DataGridRowSelectDescriptor;
}
