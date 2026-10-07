import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cx } from 'class-variance-authority';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import styles from './pagination.module.css';

// The default label of each direction, as the name helpers below compare it.
// The four parts write the same words as the literal default of their `text`
// prop and not as these constants, on purpose: the contract compiler reads a
// prop's default from a literal in the destructured parameter and drops it,
// with a `cannot_extract` note, from one that goes through a constant (tried:
// `text.default` vanished from four contracts, two of them already shipped).
// pagination.test.tsx renders every part without `text` and asserts the
// page-describing name, which is what fails if a literal and a constant part.
const PREVIOUS_TEXT = 'Previous';
const NEXT_TEXT = 'Next';

// The visible content and the accessible name of the previous/next parts,
// shared by the anchor and the button forms so the four cannot drift. The
// chevrons carry `styles.chevron`: it is what mirrors them under a
// right-to-left direction.
function previousContent(text: string) {
  return (
    <>
      <ChevronLeftIcon className={cx(styles.icon, styles.chevron)} />
      <span className={styles.previousNextText}>{text}</span>
    </>
  );
}

function nextContent(text: string) {
  return (
    <>
      <span className={styles.previousNextText}>{text}</span>
      <ChevronRightIcon className={cx(styles.icon, styles.chevron)} />
    </>
  );
}

// The default text keeps the longer name that says which page it goes to. A
// custom text IS the name: the label is hidden below 640px and the chevron is
// decorative, so a fixed name would leave the words on screen out of it (and
// out of a voice-control user's reach). An empty or blank text hides the label,
// which is the icon-only form, so it keeps the default name rather than none (a
// whitespace-only aria-label is ignored by the accessible name computation).
function previousLabel(text: string) {
  return text.trim() && text !== PREVIOUS_TEXT ? text : 'Go to previous page';
}

function nextLabel(text: string) {
  return text.trim() && text !== NEXT_TEXT ? text : 'Go to next page';
}

export type PaginationProps = ComponentProps<'nav'>;

export function Pagination({ className, ...props }: PaginationProps) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cx(styles.pagination, className)}
      {...props}
    />
  );
}

export type PaginationContentProps = ComponentProps<'ul'>;

export function PaginationContent({ className, ...props }: PaginationContentProps) {
  return <ul className={cx(styles.content, className)} {...props} />;
}

export type PaginationItemProps = ComponentProps<'li'>;

export function PaginationItem(props: PaginationItemProps) {
  return <li {...props} />;
}

export interface PaginationLinkProps extends Omit<ComponentProps<'a'>, 'className'> {
  className?: string;
  isActive?: boolean;
  /**
   * Square, icon-sized footprint (aspect-ratio 1, no horizontal padding) —
   * the common case for a bare page number, matching upstream's
   * `size="icon"` default. `PaginationPrevious`/`PaginationNext` opt out
   * (`square={false}`): they carry an icon AND a text label side by side,
   * so a fixed-width square would clip the label.
   * @default true
   */
  square?: boolean;
}

export function PaginationLink({ className, isActive, square = true, ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive || undefined}
      className={cx(styles.link, square && styles.square, className)}
      {...props}
    />
  );
}

export interface PaginationPreviousProps extends Omit<PaginationLinkProps, 'square'> {
  /** Label text, hidden below the `sm` breakpoint (640px) — matching
   * upstream's `hidden sm:block`. Also the accessible name when given, since
   * the label is hidden at that width. @default 'Previous' */
  text?: string;
}

export function PaginationPrevious({
  className,
  text = 'Previous',
  ...props
}: PaginationPreviousProps) {
  return (
    <PaginationLink
      aria-label={previousLabel(text)}
      square={false}
      className={cx(styles.previous, className)}
      {...props}
    >
      {previousContent(text)}
    </PaginationLink>
  );
}

export interface PaginationNextProps extends Omit<PaginationLinkProps, 'square'> {
  /** Also the accessible name when given. @default 'Next' */
  text?: string;
}

export function PaginationNext({ className, text = 'Next', ...props }: PaginationNextProps) {
  return (
    <PaginationLink
      aria-label={nextLabel(text)}
      square={false}
      className={cx(styles.next, className)}
      {...props}
    >
      {nextContent(text)}
    </PaginationLink>
  );
}

/*
 * The button forms: the same items for state-driven paging, where a page
 * change is a state update and has no URL of its own. They are separate
 * parts rather than a `render`/`as` on the link because PaginationLink's
 * contract promises a real anchor (see pagination-link.contract.yaml); a
 * button part keeps that promise intact and shares every class with it, so
 * the two forms paint identically.
 */
export interface PaginationButtonProps extends Omit<ComponentProps<'button'>, 'className'> {
  className?: string;
  /** Marks the page in view: sets `aria-current="page"` and the active
   * paint, same as PaginationLink's. */
  isActive?: boolean;
  /** Same square footprint as PaginationLink's. @default true */
  square?: boolean;
  /**
   * Keep the button in the tab order while `disabled`, reporting
   * `aria-disabled` instead of the native attribute. Without it a button that
   * holds keyboard focus when it becomes disabled (Previous, paged down to the
   * first page) is blurred by the browser and focus falls to the page. Same
   * name and meaning as Button's, which this renders through the same Base UI
   * primitive.
   * @default false
   */
  focusableWhenDisabled?: boolean;
}

export function PaginationButton({
  className,
  isActive,
  square = true,
  type = 'button',
  ...props
}: PaginationButtonProps) {
  return (
    <ButtonPrimitive
      type={type}
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive || undefined}
      className={cx(styles.link, square && styles.square, className)}
      {...props}
    />
  );
}

export interface PaginationPreviousButtonProps extends Omit<PaginationButtonProps, 'square' | 'isActive'> {
  /** Label text, hidden below the `sm` breakpoint (640px). Also the
   * accessible name when given. @default 'Previous' */
  text?: string;
}

export function PaginationPreviousButton({
  text = 'Previous',
  ...props
}: PaginationPreviousButtonProps) {
  return (
    <PaginationButton aria-label={previousLabel(text)} square={false} {...props}>
      {previousContent(text)}
    </PaginationButton>
  );
}

export interface PaginationNextButtonProps extends Omit<PaginationButtonProps, 'square' | 'isActive'> {
  /** Also the accessible name when given. @default 'Next' */
  text?: string;
}

export function PaginationNextButton({ text = 'Next', ...props }: PaginationNextButtonProps) {
  return (
    <PaginationButton aria-label={nextLabel(text)} square={false} {...props}>
      {nextContent(text)}
    </PaginationButton>
  );
}

export type PaginationEllipsisProps = ComponentProps<'span'>;

export function PaginationEllipsis({ className, ...props }: PaginationEllipsisProps) {
  return (
    <span aria-hidden="true" className={cx(styles.ellipsis, className)} {...props}>
      <MoreHorizontalIcon className={styles.icon} />
      <span className={styles.srOnly}>More pages</span>
    </span>
  );
}
