import type {
  DataGridTreeItem,
  DataGridTreeItemId,
  DataGridTreeNode,
} from '../../../../tree-structure/tree-structure-types';

type FilterValueMapper<T extends DataGridTreeItem = DataGridTreeItem> =
  string | ((item: T) => string | number);

interface TreeLike<T extends DataGridTreeItem = DataGridTreeItem> {
  getNode: (id: DataGridTreeItemId) => DataGridTreeNode<T> | undefined;
}

export function resolveFilterTreeValue<T extends DataGridTreeItem = DataGridTreeItem>(
  tree: TreeLike<T>,
  nodeId: DataGridTreeItemId,
  filterValue?: FilterValueMapper<T>,
): string | number {
  if (!filterValue) {
    return nodeId;
  }

  const node = tree.getNode(nodeId);
  if (!node) {
    return nodeId;
  }

  if (typeof filterValue === 'function') {
    return filterValue(node.item);
  }

  const value = node.item[filterValue];
  return typeof value === 'string' || typeof value === 'number' ? value : nodeId;
}
