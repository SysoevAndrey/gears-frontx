import type { DataGridTreeItem, DataGridTreeNode } from '../../tree-structure/tree-structure-types';
import { useTreeContext } from '../services/core/tree-context';
import type { TreeListItemProps } from './tree-list-item';
import { TreeLayoutSlot } from './tree-layout-slot';
import { TreeNodeContent } from './tree-node-content';

interface TreeNodeLeafProps<TItem extends DataGridTreeItem> {
  node: DataGridTreeNode<TItem>;
}

export function TreeNodeLeaf<TItem extends DataGridTreeItem = DataGridTreeItem>({
  node,
}: TreeNodeLeafProps<TItem>) {
  const { settings, layout } = useTreeContext<TItem>();
  const LeafComponent = layout.useComponent<TreeListItemProps<TItem>>('leaf');

  const leftSlots = layout.useSlots('left');
  const hasLeftSlot = leftSlots.length > 0;

  const isShowItemStart = computeIsShowItemStart();

  function computeIsShowItemStart() {
    const { showInlineStart } = settings;

    if (!showInlineStart || showInlineStart === 'leaf') {
      return true;
    }

    if (showInlineStart === 'directory') {
      return false;
    }

    return showInlineStart(node.item);
  }

  return (
    // eslint-disable-next-line react-hooks/static-components -- LeafComponent comes from the tree's component registry (a store lookup), so it is the same component on every render; the rule cannot see through the lookup.
    <LeafComponent
      node={node}
      leftSlot={
        hasLeftSlot && isShowItemStart ? (
          <TreeLayoutSlot name="left" item={node.item} node={node} />
        ) : undefined
      }
    >
      <TreeNodeContent node={node} />
    </LeafComponent>
  );
}
