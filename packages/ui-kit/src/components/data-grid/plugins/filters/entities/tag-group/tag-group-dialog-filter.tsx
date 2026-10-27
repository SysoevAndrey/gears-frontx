import { useDataGrid } from '../../../../services/core/data-grid-context';
import { DialogFilterItem } from '../../components/dialog-filter-item';
import type { DataGridFilterTagGroupEntity, DataGridFiltersPluginApi } from '../../filters-types';
import { readOptionValues } from '../../services/read-option-values';
import { TagGroupList } from './tag-group-list';

interface TagGroupDialogFilterProps {
  filterEntity: DataGridFilterTagGroupEntity;
}

export function TagGroupDialogFilter({ filterEntity }: TagGroupDialogFilterProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const draftState = filtersApi.useDraftState(filterEntity.filterKey);
  const value = readOptionValues(draftState?.value);

  function handleChange(newValue: (string | number)[]) {
    filtersApi.setDraftState(filterEntity.filterKey, { value: newValue });
  }

  return (
    <DialogFilterItem filterEntity={filterEntity}>
      <TagGroupList
        filterEntity={filterEntity}
        value={value}
        onChange={handleChange}
        searchSize="xl"
      />
    </DialogFilterItem>
  );
}
