import type { ReactNode } from 'react';
import styles from './tree-left-slot.module.css';

interface TreeLeftSlotProps {
  children?: ReactNode;
}

export function TreeLeftSlot({ children }: TreeLeftSlotProps) {
  return <div className={styles.treeLeftSlot}>{children}</div>;
}
