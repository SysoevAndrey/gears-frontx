import { useEffect } from 'react';
import type { DataGridTreeItem } from '../../tree-structure/tree-structure-types';
import { useTree } from '../services/core/tree-context';
import { TreeMain } from './tree-main';

export function TreeContent<TItem extends DataGridTreeItem = DataGridTreeItem>() {
  const tree = useTree<TItem>();
  const treeStructure = tree.treeStructure.current;

  useEffect(() => {
    tree.init();
    return () => tree.destroy();
  }, [tree]);

  if (!treeStructure) {
    return null;
  }

  return <TreeMain />;
}
