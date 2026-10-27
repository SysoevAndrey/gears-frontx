import type {
  DataGridFilterCheckboxGroupEntity,
  DataGridFilterCheckboxGroupEntityParams,
  DataGridFilterCheckboxGroupOption,
  DataGridFilterCheckboxGroupOptionsLoader,
  DataGridFilterCheckboxGroupState,
  DataGridFilterEntity,
  DataGridFilterPopoverOptions,
} from '../../filters-types';
import { createFilterEntity } from '../entities';
import { CheckboxGroupDialogFilter } from './checkbox-group-dialog-filter';
import { CheckboxGroupQuickFilter } from './checkbox-group-quick-filter';

interface DataGridFilterCheckboxGroupConfig {
  /** Must match the column id to properly associate the filter with its corresponding column. */
  id: DataGridFilterEntity['id'];
  filterKey?: DataGridFilterEntity['filterKey'];
  label?: DataGridFilterEntity['label'];
  /**
   * A static option list (filtered locally) or an async resolver. Pass a
   * function to search options server-side when the set is too large to load up
   * front — it receives the trimmed term (empty string for the initial list).
   */
  options: DataGridFilterCheckboxGroupOption[] | DataGridFilterCheckboxGroupOptionsLoader;
  search?: boolean;
  /** Debounce in ms applied to the async options resolver. Defaults to 300. */
  searchDebounce?: number;
  popover?: DataGridFilterPopoverOptions;
}

export function filterCheckboxGroup(
  config: DataGridFilterCheckboxGroupConfig,
): DataGridFilterCheckboxGroupEntity {
  const { options } = config;

  return createFilterEntity<
    DataGridFilterCheckboxGroupState,
    DataGridFilterCheckboxGroupEntityParams
  >({
    id: config.id,
    filterKey: config.filterKey ?? config.id,
    label: config.label,
    filterComponent: CheckboxGroupQuickFilter,
    dialogFilterComponent: CheckboxGroupDialogFilter,
    params: {
      options,
      get search() {
        // Async filters always need the search box; static ones keep the
        // "show once the list gets long" heuristic.
        return config.search ?? (typeof options === 'function' || options.length > 5);
      },
      searchDebounce: config.searchDebounce,
      popover: config.popover,
    },
  });
}
