import { useEffect, useState } from 'react';
import type { DataGridTreeItem } from '../tree-structure/tree-structure-types';
import { useLatest } from '../utils/use-latest';
import { TreeContent } from './components/tree-content';
import { createTree } from './create-tree';
import { TreeProvider } from './services/core/tree-context';
import { internalContextKey } from './services/internal/internal-helpers';
import type { TreeProps } from './tree-types';

export function Tree<TItem extends DataGridTreeItem = DataGridTreeItem>({
  name,
  treeStructure,
  children,
  ...settingsProps
}: TreeProps<TItem>) {
  const treeStructureRef = useLatest(treeStructure);
  const [tree] = useState(() =>
    createTree<TItem>({
      ...settingsProps,
      name,
      treeStructure: treeStructureRef,
    }),
  );

  useEffect(() => {
    tree[internalContextKey].layout.setFilter(settingsProps.filter);
  }, [tree, settingsProps.filter]);

  return (
    <TreeProvider value={tree}>
      {children}
      <TreeContent />
    </TreeProvider>
  );
}
