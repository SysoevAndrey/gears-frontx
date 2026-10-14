import { DropdownMenu } from '../../../dropdown-menu/public.js';
import type { DataGridTreeItem } from '../../tree-structure/tree-structure-types';
import { useTreeContext } from '../services/core/tree-context';
import { TreeLayoutSlot } from './tree-layout-slot';
import styles from './tree-main.module.css';
import { TreeNodes } from './tree-nodes';
import type { TreePlaceholderProps } from './tree-placeholder';

export function TreeMain<TItem extends DataGridTreeItem = DataGridTreeItem>() {
  const { settings, layout, focus } = useTreeContext<TItem>();
  const rootNodes = settings.treeStructure.current.useRootNodes();
  const PlaceholderComponent = layout.useComponent<TreePlaceholderProps<TItem>>('placeholder');

  return (
    <div
      className={styles.treeMain}
      role="tree"
      aria-label={settings.ariaLabel}
      aria-labelledby={settings.ariaLabelledBy}
      onKeyDown={focus.handleKeyDown}
    >
      {/* The menu without a popup of its own: it only supplies the items, which the tree turns
          into tree items and navigates itself (see the focus service). */}
      <DropdownMenu open modal={false}>
        {rootNodes.length > 0 ? (
          <TreeNodes nodes={rootNodes} />
        ) : (
          // eslint-disable-next-line react-hooks/static-components -- PlaceholderComponent comes from the tree's component registry (a store lookup), so it is the same component on every render; the rule cannot see through the lookup.
          <PlaceholderComponent parent={null} />
        )}
      </DropdownMenu>
      <TreeLayoutSlot name="bottom" />
    </div>
  );
}
