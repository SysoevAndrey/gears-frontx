import type { ReactElement, ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerTrigger } from '../../../../drawer/public.js';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../popover/public.js';
import { useIsTabletUp } from '../../../utils/use-is-tablet-up';
import styles from './adaptive-popover.module.css';

interface AdaptivePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The element that opens the popup; it is rendered as the trigger. */
  trigger: ReactElement;
  /**
   * A floor for the width of what the popover holds, as a CSS length; the popover grows to fit it.
   * Not applied to the narrow-screen panel.
   */
  minInlineSize?: string;
  children: ReactNode;
}

/**
 * A popover beside its trigger from tablet width up, and a panel from the bottom edge below it,
 * where a popover would not fit.
 */
export function AdaptivePopover({
  open,
  onOpenChange,
  trigger,
  minInlineSize,
  children,
}: AdaptivePopoverProps) {
  const isTabletUp = useIsTabletUp();

  if (isTabletUp) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger render={trigger} />
        <PopoverContent className={styles.popover}>
          {minInlineSize != null ? <div style={{ minInlineSize }}>{children}</div> : children}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="bottom">
      <DrawerTrigger render={trigger} />
      <DrawerContent>{children}</DrawerContent>
    </Drawer>
  );
}
