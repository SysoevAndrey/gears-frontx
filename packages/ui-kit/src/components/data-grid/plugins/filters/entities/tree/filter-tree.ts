import type { TreeLabel } from '../../../../tree/services/settings/settings-types';
import type {
  DataGridTreeItem,
  DataGridTreeStructure,
} from '../../../../tree-structure/tree-structure-types';
import type {
  DataGridFilterEntity,
  DataGridFilterPopoverOptions,
  DataGridFilterTreeEntity,
  DataGridFilterTreeEntityParams,
  DataGridFilterTreeState,
} from '../../filters-types';
import { createFilterEntity } from '../entities';
import { resolveFilterTreeValue } from './resolve-filter-tree-value';
import { TreeDialogFilter } from './tree-dialog-filter';
import { TreeQuickFilter } from './tree-quick-filter';

interface DataGridFilterTreeConfig<Item extends DataGridTreeItem = DataGridTreeItem> {
  /** Must match the column id to properly associate the filter with its corresponding column. */
  id: DataGridFilterEntity['id'];
  filterKey?: DataGridFilterEntity['filterKey'];
  label?: DataGridFilterEntity['label'];
  tree: DataGridTreeStructure<Item>;
  treeLabel: TreeLabel<Item>;
  /** Maps the selected tree node to the filter value sent to the load function.
   *  When omitted, the node's key (id) is used as the filter value.
   *  Pass a property name (e.g. 'name') or a function (item) => value. */
  filterValue?: string | ((item: Item) => string | number);
  search?: boolean;
  popover?: DataGridFilterPopoverOptions;
}

export function filterTree<Item extends DataGridTreeItem = DataGridTreeItem>(
  config: DataGridFilterTreeConfig<Item>,
): DataGridFilterTreeEntity {
  return createFilterEntity<DataGridFilterTreeState, DataGridFilterTreeEntityParams>({
    id: config.id,
    filterKey: config.filterKey ?? config.id,
    label: config.label,
    filterComponent: TreeQuickFilter,
    dialogFilterComponent: TreeDialogFilter,
    params: {
      tree: config.tree,
      treeLabel: config.treeLabel,
      get search() {
        return config.search ?? config.tree.getNodes().length > 5;
      },
      popover: config.popover,
    },
    resolveLoadValue: config.filterValue
      ? (state) => ({
          value: resolveFilterTreeValue(config.tree, state.value, config.filterValue),
        })
      : undefined,
  });
}
