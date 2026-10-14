import type {
  DataGridFilterEntity,
  DataGridFilterSearchEntity,
  DataGridFilterSearchState,
} from '../../filters-types';
import { createFilterEntity } from '../entities';
import { FilterSearch } from './search-quick-filter';

interface DataGridFilterSearchConfig {
  /** Must match the column id to properly associate the filter with its corresponding column. */
  id: DataGridFilterSearchEntity['id'];
  filterKey?: DataGridFilterEntity['filterKey'];
  label?: DataGridFilterSearchEntity['label'];
}

export function filterSearch(config: DataGridFilterSearchConfig): DataGridFilterSearchEntity {
  return createFilterEntity<DataGridFilterSearchState>({
    id: config.id,
    filterKey: config.filterKey ?? config.id,
    label: config.label,
    filterComponent: FilterSearch,
  });
}
