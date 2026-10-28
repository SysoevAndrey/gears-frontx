import type { DataGridItem } from '../../data-grid-types';
import { getItemKeyValue } from '../../services/storage/storage-helpers';
import type { DataGridDataKey, DataGridParentId } from '../../services/storage/storage-types';

export function createTreeDataFromFlattenedArray<TItem extends DataGridItem = DataGridItem>(
  items: TItem[],
  parentKey: DataGridDataKey<TItem>,
): Map<DataGridParentId, TItem[]> {
  const results = new Map<DataGridParentId, TItem[]>();

  for (const item of items) {
    const parentId = getItemKeyValue(item, parentKey) ?? null;
    const group = results.get(parentId);
    if (group) {
      group.push(item);
    } else {
      results.set(parentId, [item]);
    }
  }

  return results;
}
