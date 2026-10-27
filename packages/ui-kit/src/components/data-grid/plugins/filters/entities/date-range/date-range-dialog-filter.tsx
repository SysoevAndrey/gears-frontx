import { useDataGrid } from '../../../../services/core/data-grid-context';
import { DialogFilterItem } from '../../components/dialog-filter-item';
import type {
  DataGridFilterDateRangeEntity,
  DataGridFilterDateRangeState,
  DataGridFilterDateRangeValue,
  DataGridFiltersPluginApi,
} from '../../filters-types';
import { DateRangeCalendar } from './date-range-calendar';
import { isEmptyDateRange } from './date-range-value';

interface DateRangeDialogFilterProps {
  filterEntity: DataGridFilterDateRangeEntity;
}

export function DateRangeDialogFilter({ filterEntity }: DateRangeDialogFilterProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const draftState = filtersApi.useDraftState<DataGridFilterDateRangeState>(filterEntity.filterKey);
  const value = draftState?.value ?? {};

  function handleChange(newValue: DataGridFilterDateRangeValue) {
    // The draft store has no remove; clearing writes `undefined`, which the section
    // badge and the applied state both read as inactive.
    filtersApi.setDraftState(filterEntity.filterKey, {
      value: isEmptyDateRange(newValue) ? undefined : newValue,
    });
  }

  return (
    <DialogFilterItem filterEntity={filterEntity}>
      <DateRangeCalendar
        value={value}
        onChange={handleChange}
        modelDateFormat={filterEntity.params.modelDateFormat}
      />
    </DialogFilterItem>
  );
}
