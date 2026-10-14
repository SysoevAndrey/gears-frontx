import type {
  DataGridFilterEntity,
  DataGridFilterToggleEntity,
  DataGridFilterToggleState,
} from '../../filters-types';
import { createFilterEntity } from '../entities';
import { FilterToggle } from './toggle-quick-filter';

interface DataGridFilterToggleConfig {
  /** Must match the column id to properly associate the filter with its corresponding column. */
  id: DataGridFilterToggleEntity['id'];
  filterKey?: DataGridFilterEntity['filterKey'];
  label?: DataGridFilterToggleEntity['label'];
}

export function filterToggle(config: DataGridFilterToggleConfig): DataGridFilterToggleEntity {
  return createFilterEntity<DataGridFilterToggleState>({
    id: config.id,
    filterKey: config.filterKey ?? config.id,
    label: config.label,
    filterComponent: FilterToggle,
  });
}
