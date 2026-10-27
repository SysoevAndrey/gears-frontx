import { format, isValid, parse, set } from 'date-fns';
import type { DataGridFilterDateRangeValue } from '../../filters-types';

/**
 * Default format of the emitted bounds, as date-fns tokens. Calendar-only dates: a date filter has
 * no time of day, and plain dates are what range query params expect.
 */
export const dateRangeModelFormat = 'yyyy-MM-dd';

/** A range with neither bound set filters nothing, so it is stored as no filter at all. */
export function isEmptyDateRange(value: DataGridFilterDateRangeValue): boolean {
  return !value.from && !value.to;
}

/**
 * Reads a bound the filter state holds. It is text the user may have edited (it is stored in the
 * browser, or in the address bar), so anything that is not a date in `modelFormat` is no date.
 */
export function parseModelDate(modelValue: unknown, modelFormat: string): Date | null {
  if (typeof modelValue !== 'string' || modelValue === '') return null;

  const parsed = parse(modelValue, modelFormat, new Date());
  return isValid(parsed) ? parsed : null;
}

/**
 * A day as a bound. The time of day is noon, so that a format that carries one is not thrown a day
 * off by the zone the value is later read in.
 */
export function formatToModel(date: Date, modelFormat: string): string {
  return format(set(date, { hours: 12, minutes: 0, seconds: 0 }), modelFormat);
}
