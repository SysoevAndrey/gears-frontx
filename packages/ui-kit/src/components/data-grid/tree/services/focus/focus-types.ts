import type { KeyboardEvent } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { DataGridTreeItemId } from '../../../tree-structure/tree-structure-types';

export interface TreeFocusStore {
  focusedNodeId: DataGridTreeItemId | null;
}

export interface TreeFocusPublicApi {
  /**
   * Set the focused node ID.
   *
   * @param id - Node ID to focus, or null to clear focus
   */
  setFocusedNode: (id: DataGridTreeItemId | null) => void;

  /**
   * Focus a node by ID (sets focus state and moves DOM focus).
   *
   * @param id - Node ID to focus
   */
  focusNode: (id: DataGridTreeItemId) => void;
}

export interface TreeFocusService extends TreeFocusPublicApi {
  useFocusStore: UseBoundStore<StoreApi<TreeFocusStore>>;
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}
