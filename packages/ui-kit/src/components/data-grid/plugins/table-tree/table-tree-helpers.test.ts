import { describe, expect, it } from 'vitest';
import { createTreeDataFromFlattenedArray } from './table-tree-helpers';

interface TestItem {
  id: number;
  name: string;
  parent_id: number | null;
}

describe('createTreeDataFromFlattenedArray', () => {
  it('groups items by parent key', () => {
    const items: TestItem[] = [
      { id: 1, name: 'Root A', parent_id: null },
      { id: 2, name: 'Root B', parent_id: null },
      { id: 3, name: 'Child A1', parent_id: 1 },
      { id: 4, name: 'Child A2', parent_id: 1 },
      { id: 5, name: 'Child B1', parent_id: 2 },
    ];

    const result = createTreeDataFromFlattenedArray(items, 'parent_id');

    expect(result.size).toBe(3);
    expect(result.get(null)).toHaveLength(2);
    expect(result.get(1)).toHaveLength(2);
    expect(result.get(2)).toHaveLength(1);
  });

  it('treats undefined parent as null (root)', () => {
    // The key has to be present on the item (a missing one throws), so the absent parent is the
    // value `undefined`, which the declared type does not allow.
    const items = [{ id: 1, name: 'No parent', parent_id: undefined }];

    const result = createTreeDataFromFlattenedArray(items, 'parent_id');

    expect(result.get(null)).toHaveLength(1);
  });

  it('returns empty map for empty array', () => {
    const result = createTreeDataFromFlattenedArray<TestItem>([], 'parent_id');

    expect(result.size).toBe(0);
  });

  it('supports function key extractor', () => {
    const items: TestItem[] = [
      { id: 1, name: 'Root', parent_id: null },
      { id: 2, name: 'Child', parent_id: 1 },
    ];

    const result = createTreeDataFromFlattenedArray(items, (item) => item.parent_id!);

    expect(result.get(null)).toHaveLength(1);
    expect(result.get(1)).toHaveLength(1);
  });

  it('preserves item order within groups', () => {
    const items: TestItem[] = [
      { id: 1, name: 'First', parent_id: null },
      { id: 2, name: 'Second', parent_id: null },
      { id: 3, name: 'Third', parent_id: null },
    ];

    const result = createTreeDataFromFlattenedArray(items, 'parent_id');
    const rootItems = result.get(null)!;

    expect(rootItems[0].name).toBe('First');
    expect(rootItems[1].name).toBe('Second');
    expect(rootItems[2].name).toBe('Third');
  });
});
