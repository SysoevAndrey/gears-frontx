import type { DataGridTreeItemId } from '../../../../tree-structure/tree-structure-types';
import { useDataGrid } from '../../../../services/core/data-grid-context';
import { DialogFilterItem } from '../../components/dialog-filter-item';
import type {
  DataGridFilterTreeEntity,
  DataGridFilterTreeState,
  DataGridFiltersPluginApi,
} from '../../filters-types';
import { TreeList } from './tree-list';

interface TreeDialogFilterProps {
  filterEntity: DataGridFilterTreeEntity;
}

export function TreeDialogFilter({ filterEntity }: TreeDialogFilterProps) {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const draftState = filtersApi.useDraftState<DataGridFilterTreeState>(filterEntity.filterKey);
  const value = draftState?.value;

  function handleChange(newValue: DataGridTreeItemId) {
    filtersApi.setDraftState(filterEntity.filterKey, { value: newValue });
  }

  return (
    <DialogFilterItem filterEntity={filterEntity}>
      <TreeList filterEntity={filterEntity} value={value} onChange={handleChange} searchSize="xl" />
    </DialogFilterItem>
  );
}
