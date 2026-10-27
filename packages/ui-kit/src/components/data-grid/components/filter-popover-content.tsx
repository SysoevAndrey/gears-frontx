import type { CSSProperties, ReactNode } from 'react';
import styles from './filter-popover-content.module.css';

interface FilterPopoverContentProps {
  children: ReactNode;
  maxInlineSize?: string;
}

export function FilterPopoverContent({ children, maxInlineSize }: FilterPopoverContentProps) {
  const style: CSSProperties | undefined = maxInlineSize ? { maxInlineSize } : undefined;

  return (
    <div className={styles.content} style={style}>
      {children}
    </div>
  );
}
