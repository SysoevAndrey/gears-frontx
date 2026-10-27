import type { DataGridTreeItem, DataGridTreeNode } from '../../tree-structure/tree-structure-types';
import { useTreeContext } from '../services/core/tree-context';

interface TreeNodeContentProps<TItem extends DataGridTreeItem> {
  node: DataGridTreeNode<TItem>;
}

export function TreeNodeContent<TItem extends DataGridTreeItem = DataGridTreeItem>({
  node,
}: TreeNodeContentProps<TItem>) {
  const { settings, layout } = useTreeContext<TItem>();
  const labelSlots = layout.useSlots('label');
  const LabelComponent = labelSlots[0]?.component;

  const label = computeLabel();

  if (LabelComponent) {
    return <LabelComponent item={node.item} label={label} />;
  }

  function computeLabel() {
    if (!settings.label) {
      return String(node.item.id);
    }

    if (typeof settings.label === 'string') {
      return String(node.item[settings.label]);
    }

    return settings.label(node.item);
  }

  return <span>{label}</span>;
}
