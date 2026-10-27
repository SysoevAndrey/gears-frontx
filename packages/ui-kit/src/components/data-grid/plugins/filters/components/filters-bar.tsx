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
  // Every quick filter has the same keyed wrapper, so none is remounted, and none loses its open
  // popover, when a filter added or taken away makes another one the last.
  const quickFilters = entities.filter((e) => e.filterComponent);
  const hasAllFilters = isAllFiltersOptionVisible && hasDialogEntities;

  return (
    <div className={styles.filterOptions}>
      {quickFilters.map((filterEntity, index) => {
        const isLast = index === quickFilters.length - 1;
        return (
          <div key={filterEntity.id} className={isLast ? styles.tail : styles.chip}>
            <FilterSingle filterEntity={filterEntity} />
            {isLast && hasAllFilters && <AllFiltersButton />}
          </div>
        );
      })}
      {quickFilters.length === 0 && hasAllFilters && <AllFiltersButton />}
    </div>
  );
}
