import { useEffect, useRef, useState } from 'react';
import { cx } from 'class-variance-authority';
import { useDataGridContext } from '../../core/data-grid-context';
import { DataGridLayoutTopDefault } from './data-grid-layout-top-default';
import styles from './data-grid-layout-top.module.css';
import { isOnOneLine } from './toolbar-lines';

export function DataGridLayoutTop() {
  const context = useDataGridContext();

  const activeSlotId = context.layout.useLayoutStore((state) => state.activeSlotIds.get('top'));
  const topLayoutSlots = context.layout.useLayoutStore((state) => state.slots.get('top'));
  const topLayoutSlot = topLayoutSlots?.find((s) => s.id === activeSlotId);
  const isDefault = topLayoutSlot?.id === 'default';

  // The room the default toolbar takes, read while it is on screen, and only while it is on one
  // line. A slot that replaces it (the row select bar) is given at least that much, so the table
  // under it does not move when one takes the other's place. A toolbar that has wrapped onto
  // several lines (a row of quick filters on a narrow screen) is not a room to keep: the slot takes
  // its own height there, and the table moves up with it. The wrapper is a `flow-root`, its own
  // formatting context whatever it is laid out in, so the toolbar's bottom margin is inside its
  // box: its size is the room, margin included.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [defaultBlockSize, setDefaultBlockSize] = useState<number>();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!isDefault || !wrapper) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      const blockSize = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      setDefaultBlockSize(isOnOneLine(wrapper) ? blockSize : undefined);
    });
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, [isDefault]);

  if (!topLayoutSlot) return null;

  const TopComponent = isDefault ? DataGridLayoutTopDefault : topLayoutSlot.component;

  return (
    <div
      ref={wrapperRef}
      className={cx(styles.wrapper, !isDefault && styles.replacement)}
      style={!isDefault && defaultBlockSize ? { minBlockSize: defaultBlockSize } : undefined}
    >
      <TopComponent />
    </div>
  );
}
