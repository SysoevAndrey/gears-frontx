import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createDataGridTreeStructure, useDataGridTreeStructure } from './tree-structure';

interface Dept {
  id: string;
  parent_id: string | null;
  name: string;
  [key: string]: unknown;
}

// eng
// ├── web
// │   └── ui
// └── api
// ops
const flat: Dept[] = [
  { id: 'eng', parent_id: null, name: 'Engineering' },
  { id: 'web', parent_id: 'eng', name: 'Web' },
  { id: 'ui', parent_id: 'web', name: 'UI' },
  { id: 'api', parent_id: 'eng', name: 'API' },
  { id: 'ops', parent_id: null, name: 'Operations' },
];

interface Nested {
  id: number;
  label: string;
  items?: Nested[] | null;
  [key: string]: unknown;
}

const nested: Nested[] = [
  { id: 1, label: 'one', items: [{ id: 2, label: 'two', items: [{ id: 3, label: 'three' }] }] },
  { id: 4, label: 'four', items: null },
];

function ids(nodes: readonly { id: string | number }[]) {
  return nodes.map((node) => node.id);
}

describe('createDataGridTreeStructure from a flat list', () => {
  it('links each item to its parent through `parent_id` by default', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });

    expect(ids(tree.getRootNodes())).toEqual(['eng', 'ops']);
    expect(ids(tree.getChildren('eng'))).toEqual(['web', 'api']);
    expect(tree.getNode('ui')?.parent?.id).toBe('web');
    expect(tree.getNode('eng')?.children).toBe(tree.getChildren('eng'));
    expect(tree.getNodes()).toHaveLength(5);
  });

  it('reads the key and parent from a property name or a function', () => {
    const items = [
      { code: 'a', up: undefined },
      { code: 'b', up: 'a' },
    ];

    const byName = createDataGridTreeStructure<(typeof items)[number]>({
      items,
      itemKey: 'code',
      parentKey: 'up',
    });
    const byFunction = createDataGridTreeStructure<(typeof items)[number]>({
      items,
      itemKey: (item) => item.code.toUpperCase(),
      parentKey: (item) => (item.up ? item.up.toUpperCase() : null),
    });

    expect(ids(byName.getChildren('a'))).toEqual(['b']);
    expect(ids(byFunction.getChildren('A'))).toEqual(['B']);
  });

  it('refuses an item that lacks the key', () => {
    expect(() => createDataGridTreeStructure({ items: [{ name: 'no id' }] })).toThrow(
      'Key "id" not found in item {"name":"no id"}',
    );
  });

  it('measures a node by its depth and its place among its siblings', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });

    expect(tree.getLevel('eng')).toBe(1);
    expect(tree.getLevel('ui')).toBe(3);
    expect(tree.getSiblingCount('api')).toBe(2);
    expect(tree.getSiblingPosition('api')).toBe(2);
    expect(tree.getSiblingCount('nope')).toBe(1);
    expect(tree.getSiblingPosition('nope')).toBe(1);
    expect(() => tree.getLevel('nope')).toThrow('Node with id "nope" not found');
  });

  it('knows a descendant at any depth, and not a sibling or the node itself', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });

    expect(tree.isDescendantOf('ui', 'eng')).toBe(true);
    expect(tree.isDescendantOf('ui', 'web')).toBe(true);
    expect(tree.isDescendantOf('api', 'web')).toBe(false);
    expect(tree.isDescendantOf('eng', 'eng')).toBe(false);
    expect(tree.isDescendantOf('nope', 'eng')).toBe(false);
  });

  it('takes whether an item is a leaf from the config, false when there is none', () => {
    const withLeaf = createDataGridTreeStructure<Dept>({
      items: flat,
      isLeaf: (item) => item.id === 'ui' || item.id === 'api',
    });
    const without = createDataGridTreeStructure<Dept>({ items: flat });

    expect(withLeaf.getNode('ui')?.isLeaf).toBe(true);
    expect(withLeaf.getNode('web')?.isLeaf).toBe(false);
    expect(without.getNode('ui')?.isLeaf).toBe(false);
  });

  it('walks the nodes depth first, parents before their children', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });
    const visited: string[] = [];

    tree.forEach((node) => visited.push(String(node.id)));

    expect(visited).toEqual(['eng', 'web', 'ui', 'api', 'ops']);
    expect(Array.from(tree.eachNode(), (node) => node.id)).toEqual(visited);
  });

  it('starts empty without items and is filled by setItems, which replaces what it had', () => {
    const tree = createDataGridTreeStructure<Dept>({});
    expect(tree.getNodes()).toEqual([]);

    tree.setItems(flat);
    expect(tree.getNodes()).toHaveLength(5);

    tree.setItems([flat[4]]);
    expect(ids(tree.getNodes())).toEqual(['ops']);
  });
});

describe('createDataGridTreeStructure from nested items', () => {
  it('reads the children from a property of each item, skipping a missing or null list', () => {
    const tree = createDataGridTreeStructure<Nested>({ items: nested, childrenKey: 'items' });

    expect(ids(tree.getRootNodes())).toEqual([1, 4]);
    expect(ids(tree.getChildren(1))).toEqual([2]);
    expect(tree.getLevel(3)).toBe(3);
    expect(tree.getNode(3)?.parent?.id).toBe(2);
    expect(tree.getChildren(4)).toEqual([]);
  });

  it('reads the children from a function, and drops null entries in the list', () => {
    const tree = createDataGridTreeStructure<Nested>({
      items: nested,
      childrenKey: (item) => (item.id === 1 ? [...(item.items ?? []), null as never] : item.items),
    });

    expect(ids(tree.getChildren(1))).toEqual([2]);
  });
});

describe('move', () => {
  it('re-parents a node at the end of the new parent, or at the position asked for', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });

    tree.move({ id: 'ui', parentId: 'api' });
    expect(ids(tree.getChildren('api'))).toEqual(['ui']);
    expect(ids(tree.getChildren('web'))).toEqual([]);
    expect(tree.getNode('ui')?.parent?.id).toBe('api');
    expect(tree.getNode('ui')?.parentId).toBe('api');
    expect(tree.getLevel('ui')).toBe(3);

    tree.move({ id: 'ops', parentId: 'eng', position: 0 });
    expect(ids(tree.getChildren('eng'))).toEqual(['ops', 'web', 'api']);
    expect(ids(tree.getRootNodes())).toEqual(['eng']);
  });

  it('moves a node to the top level with a null parent', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });

    tree.move({ id: 'web', parentId: null });

    expect(ids(tree.getRootNodes())).toEqual(['eng', 'ops', 'web']);
    expect(tree.getNode('web')?.parent).toBeNull();
  });

  it('refuses a node that is not in the tree', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });

    expect(() => tree.move({ id: 'nope', parentId: null })).toThrow('Node with id "nope" not found');
  });

  it('refuses to move a node under itself or its own descendant, and leaves the tree as it was', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });

    expect(() => tree.move({ id: 'eng', parentId: 'ui' })).toThrow(
      'Node with id "eng" cannot move under itself or its descendant "ui"',
    );
    expect(() => tree.move({ id: 'web', parentId: 'web' })).toThrow(
      'Node with id "web" cannot move under itself or its descendant "web"',
    );

    expect(ids(tree.getRootNodes())).toEqual(['eng', 'ops']);
    expect(ids(tree.getChildren('web'))).toEqual(['ui']);
    expect(tree.getLevel('ui')).toBe(3);
  });
});

describe('the hooks of a tree structure', () => {
  it('follow the structure as it changes', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });
    const { result } = renderHook(() => ({
      roots: tree.useRootNodes(),
      count: tree.useNodesCount(),
      engChildren: tree.useChildren('eng'),
      path: tree.useNodePath('ui'),
      level: tree.useNodeLevel('ui'),
      index: tree.useNodeIndex('api'),
      isLeaf: tree.useIsLeaf('ui'),
      hasUi: tree.useHasNode('ui'),
      uiUnderEng: tree.useIsDescendantOf('ui', 'eng'),
    }));

    expect(ids(result.current.roots)).toEqual(['eng', 'ops']);
    expect(result.current.count).toBe(5);
    expect(ids(result.current.engChildren)).toEqual(['web', 'api']);
    expect(ids(result.current.path)).toEqual(['eng', 'web', 'ui']);
    expect(result.current.level).toBe(3);
    expect(result.current.index).toBe(1);
    expect(result.current.isLeaf).toBe(false);
    expect(result.current.hasUi).toBe(true);
    expect(result.current.uiUnderEng).toBe(true);

    act(() => tree.move({ id: 'ui', parentId: 'ops' }));

    expect(ids(result.current.path)).toEqual(['ops', 'ui']);
    expect(result.current.level).toBe(2);
    expect(result.current.uiUnderEng).toBe(false);

    act(() => tree.move({ id: 'web', parentId: 'ops', position: 0 }));

    expect(ids(result.current.engChildren)).toEqual(['api']);
    expect(result.current.index).toBe(0);
  });

  it('read a node through useNode and drop it with setItems', () => {
    const tree = createDataGridTreeStructure<Dept>({ items: flat });
    const { result } = renderHook(() => ({
      node: tree.useNode('web'),
      nodes: tree.useNodes(),
    }));

    expect(result.current.node?.item.name).toBe('Web');
    expect(result.current.nodes).toHaveLength(5);

    act(() => tree.setItems([flat[0]]));

    expect(result.current.node).toBeUndefined();
    expect(ids(result.current.nodes)).toEqual(['eng']);
  });
});

describe('useDataGridTreeStructure', () => {
  it('creates the structure once and keeps it across renders', () => {
    const { result, rerender } = renderHook(() =>
      useDataGridTreeStructure<Dept>({ items: flat, parentKey: 'parent_id' }),
    );
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
    expect(first.getNodes()).toHaveLength(5);
  });
});
