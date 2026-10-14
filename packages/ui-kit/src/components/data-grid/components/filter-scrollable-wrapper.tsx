import type { AriaRole, ReactNode } from 'react';
import styles from './filter-scrollable-wrapper.module.css';

interface FilterScrollableWrapperProps {
  children: ReactNode;
  role?: AriaRole;
}

export function FilterScrollableWrapper({ children, role }: FilterScrollableWrapperProps) {
  return (
    <div className={styles.wrapper} role={role}>
      {children}
    </div>
  );
}
