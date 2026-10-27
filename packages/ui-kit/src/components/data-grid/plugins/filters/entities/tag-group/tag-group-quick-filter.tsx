import { useDataGrid } from '../../../../services/core/data-grid-context';
import { FilterPopover } from '../../components/filter-popover';
import type { DataGridFilterTagGroupEntity, DataGridFiltersPluginApi } from '../../filters-types';
import { readOptionValues } from '../../services/read-option-values';
import { TagGroupList } from './tag-group-list';

interface TagGroupQuickFilterProps {
  filterEntity: DataGridFilterTagGroupEntity;
}

export function TagGroupQuickFilter({ filterEntity }: TagGroupQuickFilterProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const state = filtersApi.useState(filterEntity.filterKey);
  const value = readOptionValues(state?.value);

  function handleChange(newValue: (string | number)[]) {
    if (newValue.length > 0) {
      filtersApi.setState(filterEntity.filterKey, { value: newValue });
    } else {
      filtersApi.removeState(filterEntity.filterKey);
    }
  }

  return (
    <FilterPopover filterEntity={filterEntity}>
      <TagGroupList
        filterEntity={filterEntity}
        value={value}
        onChange={handleChange}
        searchSize="m"
      />
    </FilterPopover>
  );
}
