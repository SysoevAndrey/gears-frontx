import type {
  DataGridTreeItem,
  DataGridTreeItemId,
  DataGridTreeNode,
  DataGridTreeStructure,
} from '../../../tree-structure/tree-structure-types';

/**
 * Get all visible nodes in tree order (depth-first traversal).
 * Skips children of collapsed nodes.
 *
 * @param tree - Tree structure instance
 * @param expandedIds - Set of expanded node IDs
 * @returns Flat array of visible nodes in tree order
 */
export function getVisibleNodes<Item extends DataGridTreeItem>(
  tree: DataGridTreeStructure<Item>,
  expandedIds: Set<DataGridTreeItemId>,
): DataGridTreeNode<Item>[] {
  const result: DataGridTreeNode<Item>[] = [];
  checkVisibility(tree.getRootNodes());

  return result;

  function checkVisibility(nodes: readonly DataGridTreeNode<Item>[]) {
    for (const node of nodes) {
      result.push(node);
      if (!node.isLeaf && expandedIds.has(node.id)) {
        checkVisibility(node.children);
      }
    }
  }
}

/**
 * Get next visible node in tree order.
 *
 * @param nodes - Array of visible nodes
 * @param currentId - Current node ID
 * @returns Next visible node or null if at end
 */
export function getNextVisibleNode<Item extends DataGridTreeItem>(
  nodes: DataGridTreeNode<Item>[],
  currentId: DataGridTreeItemId,
): DataGridTreeNode<Item> | null {
  const currentIndex = nodes.findIndex((node) => node.id === currentId);
  if (currentIndex === -1 || currentIndex === nodes.length - 1) {
    return null;
  }
  return nodes[currentIndex + 1];
}

/**
 * Get previous visible node in tree order.
 *
 * @param nodes - Array of visible nodes
 * @param currentId - Current node ID
 * @returns Previous visible node or null if at start
 */
export function getPreviousVisibleNode<Item extends DataGridTreeItem>(
  nodes: DataGridTreeNode<Item>[],
  currentId: DataGridTreeItemId,
): DataGridTreeNode<Item> | null {
  const currentIndex = nodes.findIndex((node) => node.id === currentId);
  if (currentIndex <= 0) {
    return null;
  }
  return nodes[currentIndex - 1];
}
