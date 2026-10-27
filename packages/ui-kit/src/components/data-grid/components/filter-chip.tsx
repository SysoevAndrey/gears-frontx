import { cx } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import styles from './filter-chip.module.css';

interface FilterChipState {
  /** The filter holds a value (or the toggle is on): a stronger border and fill. */
  active?: boolean;
  /** The hover look without a pointer, for a chip whose popup is open. */
  hover?: boolean;
}

function chipClassName({ active, hover, className }: FilterChipState & { className?: string }) {
  return cx(styles.chip, active && styles.active, hover && styles.hover, className);
}

export type FilterChipProps = ComponentProps<'button'> & FilterChipState;

/**
 * A quick-filter chip, styled like the select trigger's `filter` variant. It is a plain button
 * that passes every prop and its ref on, so a popover trigger can render it (`render={<FilterChip />}`).
 */
export function FilterChip({
  active,
  hover,
  className,
  type = 'button',
  ...props
}: FilterChipProps) {
  return <button type={type} className={chipClassName({ active, hover, className })} {...props} />;
}

export type FilterChipLabelProps = ComponentProps<'label'> & FilterChipState;

/**
 * The same chip as a `<label>`, for one that wraps a native checkbox or radio: the input is the
 * control, and the chip's focus ring shows while the input has keyboard focus.
 */
export function FilterChipLabel({ active, hover, className, ...props }: FilterChipLabelProps) {
  return <label className={chipClassName({ active, hover, className })} {...props} />;
}
