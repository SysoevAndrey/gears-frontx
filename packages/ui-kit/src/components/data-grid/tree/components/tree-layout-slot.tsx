import type { DataGridTreeItem } from '../../tree-structure/tree-structure-types';
import { useTreeContext } from '../services/core/tree-context';
import type { TreeLayoutSlotName } from '../services/layout/layout-types';

interface TreeLayoutSlotProps {
  name: TreeLayoutSlotName;
  [key: string]: unknown;
}

export function TreeLayoutSlot<TItem extends DataGridTreeItem = DataGridTreeItem>({
  name,
  ...props
}: TreeLayoutSlotProps) {
  const { layout } = useTreeContext<TItem>();
  const slots = layout.useSlots(name);

  if (slots.length === 0) {
    return null;
  }

  return (
    <>
      {slots.map((slot) => {
        const Component = slot.component;
        return <Component key={slot.id} {...props} />;
      })}
    </>
  );
}
