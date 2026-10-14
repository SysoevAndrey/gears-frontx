import { cx } from 'class-variance-authority';
import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { DropdownMenuItem } from '../../../dropdown-menu/public.js';
import type { DataGridTreeItem, DataGridTreeNode } from '../../tree-structure/tree-structure-types';
import { useTreeContext } from '../services/core/tree-context';
import { TreeActions } from './tree-actions';
import { TreeLeftSlot } from './tree-left-slot';
import styles from './tree-list-item.module.css';

export interface TreeListItemProps<TItem extends DataGridTreeItem> {
  node: DataGridTreeNode<TItem>;
  children?: ReactNode;
  className?: string;
  leftSlot?: ReactNode;
}

export function TreeListItem<TItem extends DataGridTreeItem = DataGridTreeItem>({
  node,
  children,
  className,
  leftSlot,
}: TreeListItemProps<TItem>) {
  const { settings, layout, focus } = useTreeContext<TItem>();
  const elementRef = useRef<HTMLDivElement>(null);

  const isActive = layout.useLayoutStore((state) => state.activeIds.has(node.id));
  const activeIds = layout.useLayoutStore((state) => state.activeIds);
  const focusedNodeId = focus.useFocusStore((state) => state.focusedNodeId);
  const isExpanded = layout.useLayoutStore((state) => state.expandedIds.has(node.id));
  const hasActions = layout.useLayoutStore(
    (state) => (state.slots.get('actions')?.length ?? 0) > 0,
  );

  const treeStructure = settings.treeStructure.current;
  const ariaLevel = treeStructure.getLevel(node.id);
  const ariaSetSize = treeStructure.getSiblingCount(node.id);
  const ariaPosInSet = treeStructure.getSiblingPosition(node.id);

  const isFirstNode = node.id === treeStructure.getRootNodes()[0]?.id;
  const isFocused = focusedNodeId === node.id;
  const tabIndex = computeTabIndex();
  const ellipsis = settings.ellipsis ?? true;

  useEffect(() => {
    if (isFocused && elementRef.current) {
      if (document.activeElement !== elementRef.current) {
        elementRef.current.focus();
      }
    }
  }, [isFocused]);

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!settings.click) return;

    // Check for data-tree-node-click-ignore attribute
    if (event.target instanceof Element && event.target.closest('[data-tree-node-click-ignore]')) {
      return;
    }

    settings.click({ id: node.id, item: node.item });
  }

  function handleFocus() {
    focus.setFocusedNode(node.id);
  }

  function computeTabIndex() {
    // If a node is focused, only that node is keyboard-focusable
    if (focusedNodeId !== null) {
      return isFocused ? 0 : -1;
    }

    // Explicit initialFocusedNodeId
    if (settings.initialFocusedNodeId !== undefined) {
      return node.id === settings.initialFocusedNodeId ? 0 : -1;
    }

    // First active node
    if (activeIds.size > 0) {
      const firstActiveId = Array.from(activeIds)[0];
      return node.id === firstActiveId ? 0 : -1;
    }

    // First node in tree
    return isFirstNode ? 0 : -1;
  }

  // The menu item is the kit's, kept for its row look. It sits in a menu without a popup (see
  // tree-main), so it is turned into a tree item here: the role, the roving tab stop and the
  // aria-* positions are the tree's own.
  return (
    <DropdownMenuItem
      ref={elementRef}
      role="treeitem"
      tabIndex={tabIndex}
      onClick={settings.click ? handleClick : undefined}
      onFocus={handleFocus}
      aria-selected={isActive}
      aria-expanded={node.isLeaf ? undefined : isExpanded}
      aria-level={ariaLevel}
      aria-setsize={ariaSetSize}
      aria-posinset={ariaPosInSet}
      data-active={isActive || undefined}
      className={cx(styles.treeListItem, node.isLeaf && styles.leaf, className)}
    >
      {leftSlot && <TreeLeftSlot>{leftSlot}</TreeLeftSlot>}
      <span className={cx(styles.label, ellipsis && styles.ellipsis)}>{children}</span>
      {hasActions && <TreeActions node={node} />}
    </DropdownMenuItem>
  );
}
