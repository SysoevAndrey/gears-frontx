import { cx } from 'class-variance-authority';
import type { DataGridTreeItem, DataGridTreeNode } from '../../tree-structure/tree-structure-types';
import { useTreeContext } from '../services/core/tree-context';
import type { TreeNodeContext } from '../services/plugins/plugins-types';
import styles from './tree-actions.module.css';
import { TreeLayoutSlot } from './tree-layout-slot';

interface TreeActionsProps<TItem extends DataGridTreeItem> {
  node: DataGridTreeNode<TItem>;
}

export function TreeActions<TItem extends DataGridTreeItem = DataGridTreeItem>({
  node,
}: TreeActionsProps<TItem>) {
  const { settings } = useTreeContext<TItem>();

  const nodeContext = computeNodeContext();
  const showActions = computeShowActions();

  if (showActions === false) {
    return null;
  }

  function computeNodeContext(): TreeNodeContext<TItem> {
    return {
      node,
      item: node.item,
    };
  }

  function computeShowActions() {
    const showOption = settings.showActions?.(node.item, nodeContext);
    return showOption ?? 'when_hover';
  }

  return (
    <div
      className={cx(
        styles.treeActions,
        showActions === true ? styles.treeActionsAlways : styles.treeActionsHover,
      )}
      data-tree-node-click-ignore
    >
      <TreeLayoutSlot name="actions" item={node.item} />
    </div>
  );
}
