import { FilterChip } from '../../../../components/filter-chip';
import { useDataGrid } from '../../../../services/core/data-grid-context';
import { FilterLabel } from '../../components/filter-label';
import type { DataGridFilterToggleEntity, DataGridFiltersPluginApi } from '../../filters-types';

interface FilterToggleProps {
  filterEntity: DataGridFilterToggleEntity;
}

export function FilterToggle({ filterEntity }: FilterToggleProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const state = filtersApi.useState(filterEntity.filterKey);
  const isActive = state?.value === true;

  function toggle() {
    if (isActive) {
      filtersApi.removeState(filterEntity.filterKey);
    } else {
      filtersApi.setState(filterEntity.filterKey, { value: true });
    }
  }

  return (
    <FilterChip active={isActive} onClick={toggle}>
      <FilterLabel filterEntity={filterEntity} />
    </FilterChip>
  );
}
