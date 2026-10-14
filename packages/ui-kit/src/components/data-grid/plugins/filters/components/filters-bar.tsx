import { useDataGrid } from '../../../services/core/data-grid-context';
import type { DataGridFiltersPluginApi } from '../filters-types';
import { AllFiltersButton } from './all-filters-button';
import styles from './filters-bar.module.css';
import { FilterSingle } from './filter-single';

export function FiltersBar() {
  const grid = useDataGrid();
  const filtersApi = grid.getPlugin<DataGridFiltersPluginApi>('filters')!;

  const entities = filtersApi.useFilterEntities();
  const isAllFiltersOptionVisible = filtersApi.useIsAllFiltersOptionVisible();
  const hasDialogEntities = entities.some((e) => e.dialogFilterComponent);

  // The All filters chip is set apart from the quick filters by a wider gap. A gap only ever lies
  // between two chips on a line, where a margin on the chip would also indent it whenever it
  // wraps to the start of one, so the chip travels with the last quick filter as one group.
  const quickFilters = entities.filter((e) => e.filterComponent);
  const lastQuickFilter = quickFilters[quickFilters.length - 1];
  const hasAllFilters = isAllFiltersOptionVisible && hasDialogEntities;

  return (
    <div className={styles.filterOptions}>
      {quickFilters.slice(0, -1).map((filterEntity) => (
        <FilterSingle key={filterEntity.id} filterEntity={filterEntity} />
      ))}
      {(lastQuickFilter || hasAllFilters) && (
        <div className={styles.tail}>
          {lastQuickFilter && <FilterSingle filterEntity={lastQuickFilter} />}
          {hasAllFilters && <AllFiltersButton />}
        </div>
      )}
    </div>
  );
}
