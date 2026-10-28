import type { ReactNode } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
// `.js` on each relative import: they land verbatim in the shipped declaration file, where
// `moduleResolution: "nodenext"` rejects an extensionless one and every type from it goes untyped
// (the callback's `item` and `target` among them).
import type { DataGridItem } from '../../data-grid-types.js';
import type { DataGridPluginApi } from '../../services/plugins/plugins-helpers.js';
import type { DataGridPluginContext } from '../../services/plugins/plugins-types.js';
import type { DataGridItemId, DataGridRecord } from '../../services/storage/storage-types.js';

/** Result passed to the drop callback containing the dragged item and drop target. */
export type DataGridDropResult<TItem extends DataGridItem> = DataGridPluginContext<TItem> & {
  item: TItem;
  target: TItem | null;
};

/** Callback invoked when a drag-and-drop operation completes. */
export type DataGridDropCallback<TItem extends DataGridItem> = (
  result: DataGridDropResult<TItem>,
) => void | Promise<void>;

/**
 * Renders the drag preview shown under the cursor while a row is dragged.
 * Receives the dragged row's item. When omitted, a faithful preview of the
 * dragged row is shown by default.
 */
export type DataGridDragPreviewRenderer<TItem extends DataGridItem> = (item: TItem) => ReactNode;

/** Configuration for the drag-and-drop plugin. */
export interface DataGridDragDropPluginProps<TItem extends DataGridItem = DataGridItem> {
  /** Called when a row is dropped onto a target. Can return a Promise for async operations. */
  onDrop: DataGridDropCallback<TItem>;
  /**
   * Renders a custom drag preview for the dragged row. When omitted, the plugin
   * renders a faithful preview of the dragged row instead of the browser's
   * default full-element snapshot.
   */
  renderDragPreview?: DataGridDragPreviewRenderer<TItem>;
}

/** Edge of the drop target where the indicator line is shown. */
export type DataGridDropEdge = 'top' | 'bottom';

/** Reactive drag-and-drop state tracked during a drag operation. */
export interface DataGridDragDropState {
  isDragging: boolean;
  draggedRecordId: DataGridItemId | undefined;
  dropTargetRecordId: DataGridItemId | undefined;
  dropEdge: DataGridDropEdge | undefined;
  isRootDropTarget: boolean;
}

/** Tracks per-row loading state during async drop operations. */
export interface DataGridDropLoadingState {
  loading: Record<DataGridItemId, boolean | undefined>;
}

/** Public API exposed by the drag-and-drop plugin. */
export interface DataGridDragDropPluginApi<
  TItem extends DataGridItem = DataGridItem,
> extends DataGridPluginApi<Record<string, never>> {
  /** Custom drag-preview renderer supplied via plugin config, if any. */
  renderDragPreview?: DataGridDragPreviewRenderer<TItem>;
  /** Zustand store for reactive drag-and-drop state. */
  useDragDropStore: UseBoundStore<StoreApi<DataGridDragDropState>>;
  /** Zustand store for tracking per-row loading state during async drops. */
  useDropLoadingStore: UseBoundStore<StoreApi<DataGridDropLoadingState>>;
  /** Sets the loading state for a row during an async drop operation. */
  setDropLoading: (id: DataGridItemId, value: boolean) => void;
  /** Clears the loading state for a row after an async drop completes. */
  clearDropLoading: (id: DataGridItemId) => void;
  /** @internal Called by the monitor when a drop occurs. */
  handleDrop: (
    sourceRecord: DataGridRecord<TItem>,
    targetRecord: DataGridRecord<TItem> | undefined,
  ) => void;
}
