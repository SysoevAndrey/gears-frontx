import { describe, expect, it } from 'vitest';
import type {
  DataGridTreeItem,
  DataGridTreeNode,
} from '../../../../tree-structure/tree-structure-types';
import { resolveFilterTreeValue } from './resolve-filter-tree-value';

interface MockItem extends DataGridTreeItem {
  id: string;
  name: string;
  code: number;
  [key: string]: unknown;
}

function mockNode(item: MockItem): DataGridTreeNode<MockItem> {
  return {
    id: item.id,
    parentId: null,
    isLeaf: true,
    item,
    parent: null,
    children: [],
  };
}

function createMockTree(items: MockItem[]) {
  const map = new Map(items.map((item) => [item.id, mockNode(item)]));
  return { getNode: (id: string | number) => map.get(String(id)) };
}

const items: MockItem[] = [
  { id: 'eng', name: 'Engineering', code: 100 },
  { id: 'mkt', name: 'Marketing', code: 200 },
];

const tree = createMockTree(items);

describe('resolveFilterTreeValue', () => {
  it('returns nodeId when filterValue is not provided', () => {
    expect(resolveFilterTreeValue(tree, 'eng')).toBe('eng');
  });

  it('returns nodeId when node is not found', () => {
    expect(resolveFilterTreeValue(tree, 'unknown', 'name')).toBe('unknown');
  });

  it('resolves value by property name (string)', () => {
    expect(resolveFilterTreeValue(tree, 'eng', 'name')).toBe('Engineering');
    expect(resolveFilterTreeValue(tree, 'mkt', 'name')).toBe('Marketing');
  });

  it('resolves numeric value by property name', () => {
    expect(resolveFilterTreeValue(tree, 'eng', 'code')).toBe(100);
  });

  it('falls back to nodeId when property value is not string or number', () => {
    const treeWithObj = createMockTree([{ id: 'x', name: 'X', code: 0, meta: { nested: true } }]);
    expect(resolveFilterTreeValue(treeWithObj, 'x', 'meta')).toBe('x');
  });

  it('resolves value by function mapper', () => {
    const mapper = (item: Record<string, unknown>) => `${item.name}-${item.code}`;
    expect(resolveFilterTreeValue(tree, 'eng', mapper)).toBe('Engineering-100');
  });
});
