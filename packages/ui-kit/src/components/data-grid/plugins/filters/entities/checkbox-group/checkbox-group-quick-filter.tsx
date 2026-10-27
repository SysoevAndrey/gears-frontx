import { useDataGrid } from '../../../../services/core/data-grid-context';
import { FilterPopover } from '../../components/filter-popover';
import type {
  DataGridFilterCheckboxGroupEntity,
  DataGridFiltersPluginApi,
} from '../../filters-types';
import { readOptionValues } from '../../services/read-option-values';
import { CheckboxGroupList } from './checkbox-group-list';

interface CheckboxGroupQuickFilterProps {
  filterEntity: DataGridFilterCheckboxGroupEntity;
}

export function CheckboxGroupQuickFilter({ filterEntity }: CheckboxGroupQuickFilterProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const state = filtersApi.useState(filterEntity.filterKey);
  const value = readOptionValues(state?.value);

  function handleChange(newValue: unknown[]) {
    if (newValue.length > 0) {
      filtersApi.setState(filterEntity.filterKey, { value: newValue });
    } else {
      filtersApi.removeState(filterEntity.filterKey);
    }
  }

  return (
    <FilterPopover filterEntity={filterEntity}>
      <CheckboxGroupList
        filterEntity={filterEntity}
        value={value}
        onChange={handleChange}
        searchSize="m"
      />
    </FilterPopover>
  );
}
