import { useDataGrid } from '../../../../services/core/data-grid-context';
import { FilterPopover } from '../../components/filter-popover';
import type {
  DataGridFilterDateRangeEntity,
  DataGridFilterDateRangeState,
  DataGridFilterDateRangeValue,
  DataGridFiltersPluginApi,
} from '../../filters-types';
import { DateRangeCalendar } from './date-range-calendar';
import { isEmptyDateRange } from './date-range-value';

interface DateRangeQuickFilterProps {
  filterEntity: DataGridFilterDateRangeEntity;
}

export function DateRangeQuickFilter({ filterEntity }: DateRangeQuickFilterProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const state = filtersApi.useState<DataGridFilterDateRangeState>(filterEntity.filterKey);
  const value = state?.value ?? {};

  function handleChange(newValue: DataGridFilterDateRangeValue) {
    // Never store an empty range: `isFilterValueActive` treats any object as active,
    // so `{}` would leave the chip lit with nothing selected.
    if (isEmptyDateRange(newValue)) {
      filtersApi.removeState(filterEntity.filterKey);
    } else {
      filtersApi.setState(filterEntity.filterKey, { value: newValue });
    }
  }

  return (
    <FilterPopover filterEntity={filterEntity}>
      <DateRangeCalendar
        value={value}
        onChange={handleChange}
        modelDateFormat={filterEntity.params.modelDateFormat}
      />
    </FilterPopover>
  );
}
