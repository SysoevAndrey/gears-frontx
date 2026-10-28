// `.js` on each relative type import: they land verbatim in the shipped declaration file, where
// `moduleResolution: "nodenext"` rejects an extensionless one and every type from it goes untyped
// (the `expandable` callback's `item` among them).
import type { DataGridItem } from '../../data-grid-types.js';
import type { DataGridPluginApi } from '../../services/plugins/plugins-helpers.js';
import type {
  DataGridDataKey,
  DataGridItemId,
  DataGridRecord,
  DataGridSection,
} from '../../services/storage/storage-types.js';

export interface DataGridTableTreePluginConfig<
  TItem extends DataGridItem = DataGridItem,
> extends Record<string, unknown> {
  /**
   * If passed then items split by this key. Load won't invoke for expanding items.
   */
  parentKey?: DataGridDataKey<TItem>;
  /**
   * Whether row can be expanded.
   */
  expandable?: (item: TItem) => boolean;
}

export interface DataGridTableTreePluginApi<
  TItem extends DataGridItem = DataGridItem,
> extends DataGridPluginApi<DataGridTableTreePluginConfig<TItem>> {
  useIsExpandable: (record: DataGridRecord<TItem>) => boolean;
  useIsExpanded: (itemId: DataGridItemId) => boolean;
  useLevel: (section: DataGridSection<TItem>) => number;
  toggle: (itemId: DataGridItemId) => void;
  /** Non-hook version of useIsExpandable, safe to call outside React render context. */
  isExpandable: (record: DataGridRecord<TItem>) => boolean;
}

export interface TableTreeStore {
  expandedIds: Set<DataGridItemId>;
}

export interface TableTreeConfigStore<TItem extends DataGridItem = DataGridItem> {
  parentKey: DataGridDataKey<TItem> | undefined;
  expandable: ((item: TItem) => boolean) | undefined;
}

/** Expand state as it is stored between mounts. */
export interface TableTreePersistentState {
  expanded: DataGridItemId[];
}
