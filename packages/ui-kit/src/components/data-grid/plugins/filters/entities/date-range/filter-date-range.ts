import type {
  DataGridFilterDateRangeEntity,
  DataGridFilterDateRangeEntityParams,
  DataGridFilterDateRangeState,
  DataGridFilterEntity,
  DataGridFilterPopoverOptions,
} from '../../filters-types';
import { createFilterEntity } from '../entities';
import { DateRangeDialogFilter } from './date-range-dialog-filter';
import { DateRangeQuickFilter } from './date-range-quick-filter';

interface DataGridFilterDateRangeConfig {
  /** Must match the column id to properly associate the filter with its corresponding column. */
  id: DataGridFilterEntity['id'];
  filterKey?: DataGridFilterEntity['filterKey'];
  label?: DataGridFilterEntity['label'];
  /**
   * Format the bounds are emitted in and parsed from, in date-fns tokens. Defaults to `yyyy-MM-dd`
   * (calendar dates) — deliberately not the date picker's ISO-timestamp model default.
   */
  modelDateFormat?: string;
  popover?: DataGridFilterPopoverOptions;
}

export function filterDateRange(
  config: DataGridFilterDateRangeConfig,
): DataGridFilterDateRangeEntity {
  return createFilterEntity<DataGridFilterDateRangeState, DataGridFilterDateRangeEntityParams>({
    id: config.id,
    filterKey: config.filterKey ?? config.id,
    label: config.label,
    filterComponent: DateRangeQuickFilter,
    dialogFilterComponent: DateRangeDialogFilter,
    params: {
      modelDateFormat: config.modelDateFormat,
      // Passed straight through, like every sibling entity: the popover's
      // `min-inline-size` is a floor and the popup is shrink-to-fit, so the calendar's
      // own 272px minimum already sizes the popover.
      popover: config.popover,
    },
  });
}
