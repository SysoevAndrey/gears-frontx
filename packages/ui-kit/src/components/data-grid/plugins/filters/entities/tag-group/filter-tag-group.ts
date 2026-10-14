import type {
  DataGridFilterEntity,
  DataGridFilterPopoverOptions,
  DataGridFilterTagGroupEntity,
  DataGridFilterTagGroupEntityParams,
  DataGridFilterTagGroupMode,
  DataGridFilterTagGroupOption,
  DataGridFilterTagGroupState,
} from '../../filters-types';
import { createFilterEntity } from '../entities';
import { TagGroupDialogFilter } from './tag-group-dialog-filter';
import { TagGroupQuickFilter } from './tag-group-quick-filter';

interface DataGridFilterTagGroupConfig {
  /** Must match the column id to properly associate the filter with its corresponding column. */
  id: DataGridFilterEntity['id'];
  filterKey?: DataGridFilterEntity['filterKey'];
  label?: DataGridFilterEntity['label'];
  options: DataGridFilterTagGroupOption[];
  mode?: DataGridFilterTagGroupMode;
  search?: boolean;
  popover?: DataGridFilterPopoverOptions;
}

export function filterTagGroup(config: DataGridFilterTagGroupConfig): DataGridFilterTagGroupEntity {
  return createFilterEntity<DataGridFilterTagGroupState, DataGridFilterTagGroupEntityParams>({
    id: config.id,
    filterKey: config.filterKey ?? config.id,
    label: config.label,
    filterComponent: TagGroupQuickFilter,
    dialogFilterComponent: TagGroupDialogFilter,
    params: {
      options: config.options,
      mode: config.mode ?? 'checkbox',
      get search() {
        return config.search ?? config.options.length > 10;
      },
      popover: config.popover,
    },
  });
}
