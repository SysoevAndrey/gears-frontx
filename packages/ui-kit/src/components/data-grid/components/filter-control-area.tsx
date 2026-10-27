import type { ReactNode } from 'react';
import styles from './filter-control-area.module.css';

type FilterControlAreaSize = 'm' | 'xl';

interface FilterControlAreaProps {
  children: ReactNode;
  size?: FilterControlAreaSize;
}

const sizeClassMap: Record<FilterControlAreaSize, string> = {
  m: styles.default,
  xl: styles.sizeXl,
};

export function FilterControlArea({ children, size = 'm' }: FilterControlAreaProps) {
  return <div className={sizeClassMap[size]}>{children}</div>;
}
