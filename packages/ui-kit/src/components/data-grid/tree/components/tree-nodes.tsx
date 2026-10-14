import type { DataGridTreeItem, DataGridTreeNode } from '../../tree-structure/tree-structure-types';
import { useTreeContext } from '../services/core/tree-context';
import type { TreeNodeContext } from '../services/plugins/plugins-types';
import { TreeLayoutSlot } from './tree-layout-slot';
import { TreeNodeDirectoryItem } from './tree-node-directory-item';
import { TreeNodeLeaf } from './tree-node-leaf';
import styles from './tree-nodes.module.css';
import type { TreePlaceholderProps } from './tree-placeholder';

// A list of nodes, one node and a directory render each other: a directory renders the list of its
// children. They share a module because a cycle between modules would not build.

interface TreeNodesProps<TItem extends DataGridTreeItem> {
  nodes: readonly DataGridTreeNode<TItem>[];
}

export function TreeNodes<TItem extends DataGridTreeItem = DataGridTreeItem>({
  nodes,
}: TreeNodesProps<TItem>) {
  const { layout } = useTreeContext<TItem>();

  const filter = layout.useLayoutStore((s) => s.filter);
  const filteredNodes = filter ? nodes.filter((node) => filter(node.item)) : nodes;

  return (
    <>
      {filteredNodes.map((node) => (
        <TreeNode key={node.id} node={node} />
      ))}
    </>
  );
}

interface TreeNodeProps<TItem extends DataGridTreeItem> {
  node: DataGridTreeNode<TItem>;
}

function TreeNode<TItem extends DataGridTreeItem = DataGridTreeItem>({
  node,
}: TreeNodeProps<TItem>) {
  if (node.isLeaf) {
    return <TreeNodeLeaf node={node} />;
  }

  return <TreeNodeDirectory node={node} />;
}

function TreeNodeDirectory<TItem extends DataGridTreeItem = DataGridTreeItem>({
  node,
}: TreeNodeProps<TItem>) {
  const { settings, layout } = useTreeContext<TItem>();
  const PlaceholderComponent = layout.useComponent<TreePlaceholderProps<TItem>>('placeholder');

  const isExpanded = layout.useLayoutStore((state) => state.expandedIds.has(node.id));
  const children = settings.treeStructure.current.useChildren(node.id);

  const nodeContext = computeNodeContext();
  const showDirectoryBottom = computeShowDirectoryBottom();

  function computeNodeContext(): TreeNodeContext<TItem> {
    return {
      node,
      item: node.item,
    };
  }

  function computeShowDirectoryBottom() {
    const showOption = settings.showDirectoryBottom?.(node.item, nodeContext);

    if (showOption === 'when_expanded') {
      return isExpanded;
    }

    return showOption !== false;
  }

  return (
    <div className={styles.treeNodeDirectory}>
      <TreeNodeDirectoryItem node={node} />
      {isExpanded && (
        <div className={styles.treeNodeDirectoryChildren}>
          {children.length > 0 ? (
            <TreeNodes nodes={children} />
          ) : (
            // eslint-disable-next-line react-hooks/static-components -- PlaceholderComponent comes from the tree's component registry (a store lookup), so it is the same component on every render; the rule cannot see through the lookup.
            <PlaceholderComponent parent={node.item} />
          )}
        </div>
      )}
      {showDirectoryBottom && <TreeLayoutSlot name="directory-bottom" node={node} />}
    </div>
  );
}
