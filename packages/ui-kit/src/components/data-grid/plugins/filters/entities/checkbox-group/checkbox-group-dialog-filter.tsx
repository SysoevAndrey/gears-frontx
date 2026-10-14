import { useDataGrid } from '../../../../services/core/data-grid-context';
import { DialogFilterItem } from '../../components/dialog-filter-item';
import type {
  DataGridFilterCheckboxGroupEntity,
  DataGridFiltersPluginApi,
} from '../../filters-types';
import { readOptionValues } from '../../services/read-option-values';
import { CheckboxGroupList } from './checkbox-group-list';

interface CheckboxGroupDialogFilterProps {
  filterEntity: DataGridFilterCheckboxGroupEntity;
}

export function CheckboxGroupDialogFilter({ filterEntity }: CheckboxGroupDialogFilterProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const draftState = filtersApi.useDraftState(filterEntity.filterKey);
  const value = readOptionValues(draftState?.value);

  function handleChange(newValue: (string | number)[]) {
    filtersApi.setDraftState(filterEntity.filterKey, { value: newValue });
  }

  return (
    <DialogFilterItem filterEntity={filterEntity}>
      <CheckboxGroupList
        filterEntity={filterEntity}
        value={value}
        onChange={handleChange}
        searchSize="xl"
      />
    </DialogFilterItem>
  );
}
