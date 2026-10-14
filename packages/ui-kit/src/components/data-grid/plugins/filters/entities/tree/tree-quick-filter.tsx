import type { DataGridTreeItemId } from '../../../../tree-structure/tree-structure-types';
import { useDataGrid } from '../../../../services/core/data-grid-context';
import { FilterPopover } from '../../components/filter-popover';
import type {
  DataGridFilterTreeEntity,
  DataGridFilterTreeState,
  DataGridFiltersPluginApi,
} from '../../filters-types';
import { TreeList } from './tree-list';

interface TreeQuickFilterProps {
  filterEntity: DataGridFilterTreeEntity;
}

export function TreeQuickFilter({ filterEntity }: TreeQuickFilterProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const state = filtersApi.useState<DataGridFilterTreeState>(filterEntity.filterKey);
  const value = state?.value;

  function handleChange(newValue: DataGridTreeItemId) {
    filtersApi.setState(filterEntity.filterKey, { value: newValue });
  }

  return (
    <FilterPopover filterEntity={filterEntity}>
      <TreeList filterEntity={filterEntity} value={value} onChange={handleChange} searchSize="m" />
    </FilterPopover>
  );
}
