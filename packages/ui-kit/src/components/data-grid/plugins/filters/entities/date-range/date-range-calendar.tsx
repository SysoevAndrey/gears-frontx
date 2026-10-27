import { useState } from 'react';
import { Calendar } from '../../../../../calendar/public.js';
import type { DataGridFilterDateRangeValue } from '../../filters-types';
import { dateRangeModelFormat, formatToModel, parseModelDate } from './date-range-value';
import { selectDay } from './date-range-selection';

interface DateRangeCalendarProps {
  value: DataGridFilterDateRangeValue;
  onChange: (value: DataGridFilterDateRangeValue) => void;
  modelDateFormat?: string;
}

// Monday: the week the calendar draws starts on it.
const weekStartsOn = 1;

/**
 * The body shared by the date-range quick filter and its dialog variant: an inline range calendar
 * over `{ from, to }` model-format strings.
 *
 * A click on a day goes through `selectDay`, which owns the gesture, including "a click on a
 * complete range starts a new one". The new bounds are reported in one `onChange`, so the filter
 * state updates once per click.
 */
export function DateRangeCalendar({ value, onChange, modelDateFormat }: DateRangeCalendarProps) {
  const modelFormat = modelDateFormat ?? dateRangeModelFormat;
  const from = parseModelDate(value.from, modelFormat);
  const to = parseModelDate(value.to, modelFormat);
  // View state, not filter state: the visible month is seeded from the selection but
  // is never persisted, so reopening a filter never restores a stale month.
  const [month, setMonth] = useState(() => from ?? new Date());

  function handleDayClick(day: Date) {
    // Built from scratch rather than seeded from the current value. Safe because a click always
    // gives both bounds (the opening click clears the end explicitly), so nothing is silently
    // carried over or dropped. An end-only value (only reachable through `setState`) therefore
    // starts a fresh range on the next click; the calendar cannot paint one anyway, since
    // react-day-picker's `DateRange` has no shape for an end without a start.
    const next = selectDay({ from, to }, day);
    onChange({
      from: next.from ? formatToModel(next.from, modelFormat) : undefined,
      to: next.to ? formatToModel(next.to, modelFormat) : undefined,
    });
  }

  return (
    <Calendar
      mode="range"
      selected={from ? { from, to: to ?? undefined } : undefined}
      month={month}
      onMonthChange={setMonth}
      onSelect={(_range, triggerDate) => handleDayClick(triggerDate)}
      weekStartsOn={weekStartsOn}
    />
  );
}
