import { isBefore, startOfDay } from 'date-fns';

export interface DayRange {
  from: Date | null;
  to: Date | null;
}

/**
 * The range after a click on `clicked`: a two-click cycle driven by the clicked day rather than by
 * the range the calendar reports.
 *
 * The calendar answers the very first click of a new range with `{ from: day, to: day }`, so a
 * range read straight off it looks complete after one click, and every later click would be taken
 * as the start of a new one, leaving a multi-day range unselectable. Deriving the cycle from the
 * committed bounds avoids that, and orders the two clicked days itself, so picking the end before
 * the start still gives a forward range.
 */
export function selectDay({ from, to }: DayRange, clicked: Date): DayRange {
  // The opening click of a new range. Three states land here: nothing committed, a complete range
  // (replaced as a whole), and an end without a start, which no click could extend. All three
  // clear the end, so a stale bound can never survive into the new range and invert it.
  if (!from || to) {
    return { from: clicked, to: null };
  }

  // The closing click: the earlier of the two days is the start, the later one the end.
  return isBefore(startOfDay(clicked), startOfDay(from))
    ? { from: clicked, to: from }
    : { from, to: clicked };
}
