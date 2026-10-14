import { useEffect, useMemo, useState } from 'react';
import type {
  DataGridTreeItem,
  DataGridTreeItemId,
  DataGridTreeNode,
  DataGridTreeStructure,
} from '../../../../tree-structure/tree-structure-types';
import { debounce } from '../../../../utils/debounce';

export function useTreeSearch<Item extends DataGridTreeItem>(
  treeStructure: DataGridTreeStructure<Item>,
  getLabel: (item: Item) => string,
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const debouncedUpdate = useMemo(
    () => debounce((value: string) => setDebouncedSearchTerm(value), 300),
    [],
  );

  useEffect(() => {
    debouncedUpdate(searchTerm);
    return () => debouncedUpdate.cancel();
  }, [searchTerm, debouncedUpdate]);

  let matchingItemIds: Set<DataGridTreeItemId> | null = null;

  if (debouncedSearchTerm.trim()) {
    const term = debouncedSearchTerm.toLowerCase();
    const matches = new Set<DataGridTreeItemId>();

    treeStructure.forEach((node: DataGridTreeNode<Item>) => {
      const labelValue = getLabel(node.item);
      if (labelValue.toLowerCase().includes(term)) {
        matches.add(node.id);
      }
    });
    matchingItemIds = matches;
  }

  function filter(item: Item) {
    if (!matchingItemIds) return true;

    const itemId = item.id;
    if (typeof itemId !== 'string' && typeof itemId !== 'number') return false;

    if (matchingItemIds.has(itemId)) return true;

    for (const matchId of matchingItemIds) {
      if (
        treeStructure.isDescendantOf(matchId, itemId) ||
        treeStructure.isDescendantOf(itemId, matchId)
      ) {
        return true;
      }
    }

    return false;
  }

  return {
    searchTerm,
    setSearchTerm,
    matchingItemIds,
    filter,
  };
}
