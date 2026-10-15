import { useState } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  DataGridTreeItem,
  DataGridTreeItemId,
  DataGridTreeMoveParams,
  DataGridTreeNode,
  DataGridTreeStructure,
  DataGridTreeStructureConfig,
  DataGridTreeStructureStore,
} from './tree-structure-types';

export function createDataGridTreeStructure<Item extends DataGridTreeItem>(
  config: DataGridTreeStructureConfig<Item>,
): DataGridTreeStructure<Item> {
  type DataGridTreeParentId = DataGridTreeItemId | null;

  const useStore = create<DataGridTreeStructureStore<Item>>(() => ({
    nodeMap: new Map<DataGridTreeItemId, DataGridTreeNode<Item>>(),
    childrenMap: new Map<DataGridTreeParentId, DataGridTreeNode<Item>[]>(),
  }));

  if (config.items) {
    setItems(config.items);
  }

  const useRootNodes = () => useStore(useShallow(() => getRootNodes()));
  const useNodes = () => useStore(useShallow(() => getNodes()));
  const useChildren = (parentId: DataGridTreeParentId) =>
    useStore(useShallow(() => getChildren(parentId)));
  const useNodePath = (id: DataGridTreeItemId) => useStore(useShallow(() => getPath(id)));
  const useNodesCount = () => useStore(() => getNodesCount());
  const useNode = (id: DataGridTreeItemId) => useStore(() => getNode(id));
  const useHasNode = (id: DataGridTreeItemId) => useStore(() => hasNode(id));
  const useIsLeaf = (id: DataGridTreeItemId) => useStore(() => isLeaf(id));
  const useIsDescendantOf = (descendantId: DataGridTreeItemId, parentId: DataGridTreeItemId) =>
    useStore(() => isDescendantOf(descendantId, parentId));
  const useNodeLevel = (id: DataGridTreeItemId) => useStore(() => getLevel(id));
  const useNodeIndex = (id: DataGridTreeItemId) => useStore(() => getIndex(id));

  const tree: DataGridTreeStructure<Item> = {
    setItems,
    move,

    forEach,
    eachNode,

    getNode,
    getChildren,
    getRootNodes,
    getNodes,
    getLevel,
    getSiblingCount,
    getSiblingPosition,
    isDescendantOf,

    useRootNodes,
    useNodes,
    useNodesCount,
    useNode,
    useHasNode,
    useChildren,
    useNodePath,
    useNodeLevel,
    useNodeIndex,
    useIsLeaf,
    useIsDescendantOf,
  };

  return tree;

  function getRootNodes() {
    return getChildren(null);
  }

  function getNodes() {
    const { nodeMap } = useStore.getState();
    return Array.from(nodeMap.values());
  }

  function getNodesCount() {
    const { nodeMap } = useStore.getState();
    return nodeMap.size;
  }

  function getNode(id: DataGridTreeItemId) {
    const { nodeMap } = useStore.getState();
    return nodeMap.get(id);
  }

  function isLeaf(itemId: DataGridTreeItemId) {
    return getById(itemId).isLeaf;
  }

  function isDescendantOf(descendantId: DataGridTreeItemId, parentId: DataGridTreeItemId): boolean {
    if (!hasNode(descendantId)) return false;

    let current = getById(descendantId);
    while (current.parentId) {
      if (current.parentId === parentId) {
        return true;
      }
      current = getById(current.parentId);
    }
    return false;
  }

  function move(target: DataGridTreeMoveParams) {
    const state = useStore.getState();
    const node = state.nodeMap.get(target.id);
    if (!node) {
      throw new Error(`Node with id "${target.id}" not found`);
    }
    // Under itself or its own descendant the node would cut its branch off from the roots,
    // and walking up from it (getLevel, getPath) would never end.
    if (target.parentId !== null && (target.parentId === target.id || isDescendantOf(target.parentId, target.id))) {
      throw new Error(`Node with id "${target.id}" cannot move under itself or its descendant "${target.parentId}"`);
    }

    // Create new maps for immutability
    const newChildrenMap = new Map(state.childrenMap);

    // Update old parent's children
    const oldParentChildren = newChildrenMap.get(node.parentId);
    if (oldParentChildren) {
      const newChildren = oldParentChildren.filter((child) => child.id !== target.id);
      newChildrenMap.set(node.parentId, newChildren);
    }

    // Get new parent's children
    const newParentChildren = [...(newChildrenMap.get(target.parentId) ?? [])];
    const position = target.position ?? newParentChildren.length;

    // Update node's parent
    node.parentId = target.parentId;
    node.parent = target.parentId === null ? null : (state.nodeMap.get(target.parentId) ?? null);

    // Insert node at the correct position
    newParentChildren.splice(position, 0, node);
    newChildrenMap.set(target.parentId, newParentChildren);

    // Update children references
    for (const n of state.nodeMap.values()) {
      n.children = newChildrenMap.get(n.id) ?? [];
    }

    useStore.setState({
      nodeMap: new Map(state.nodeMap),
      childrenMap: newChildrenMap,
    });
  }

  function setItems(items: Item[]) {
    const nodeMap = new Map<DataGridTreeItemId, DataGridTreeNode<Item>>();
    const childrenMap = new Map<DataGridTreeParentId, DataGridTreeNode<Item>[]>();

    // First pass: create all nodes
    if (config.childrenKey) {
      for (const [itemId, parentId, item] of eachItem(items)) {
        const node = createNode(itemId, parentId, item);
        nodeMap.set(node.id, node);
      }
    } else {
      for (const item of items) {
        const itemId = getItemId(item);
        const parentId = getItemParentId(item);
        const node = createNode(itemId, parentId, item);
        nodeMap.set(node.id, node);
      }
    }

    // Second pass: establish parent-child relationships
    for (const node of nodeMap.values()) {
      childrenMap.set(node.parentId, [...(childrenMap.get(node.parentId) ?? []), node]);
    }

    // Third pass: update parent and children references
    for (const node of nodeMap.values()) {
      node.parent = node.parentId === null ? null : (nodeMap.get(node.parentId) ?? null);
      node.children = childrenMap.get(node.id) ?? [];
    }

    useStore.setState({
      nodeMap,
      childrenMap,
    });
  }

  function* eachItem(
    items: Item[],
    parentId: DataGridTreeParentId = null,
  ): Generator<[DataGridTreeItemId, DataGridTreeParentId, Item]> {
    for (const item of items) {
      const itemId = getItemId(item);
      yield [itemId, parentId, item];

      yield* eachItem(getItemChildren(item), itemId);
    }
  }

  function createNode(
    itemId: DataGridTreeItemId,
    parentId: DataGridTreeParentId,
    item: Item,
  ): DataGridTreeNode<Item> {
    const node: DataGridTreeNode<Item> = {
      id: itemId,
      item,
      parentId,
      isLeaf: config.isLeaf ? config.isLeaf(item) : false,
      parent: null, // Will be set later
      children: [], // Will be set later
    };

    return node;
  }

  function getItemId(item: Item) {
    const { itemKey = 'id' } = config;
    if (typeof itemKey === 'function') {
      return itemKey(item);
    }

    if (!(itemKey in item)) {
      throw new Error(`Key "${itemKey}" not found in item ${JSON.stringify(item)}`);
    }

    return item[itemKey] as DataGridTreeItemId;
  }

  function getItemChildren(item: Item): Item[] {
    if (!config.childrenKey) {
      return [];
    }

    if (typeof config.childrenKey === 'function') {
      return (config.childrenKey(item) ?? []).filter((child) => child != null);
    }

    return ((item[config.childrenKey] ?? []) as Item[]).filter((child) => child != null);
  }

  function getItemParentId(item: Item) {
    const { parentKey = 'parent_id' } = config;

    if (typeof parentKey === 'function') {
      return parentKey(item) ?? null;
    }

    if (parentKey === null || parentKey === undefined) {
      return null;
    }

    return (item[parentKey] as DataGridTreeParentId) ?? null;
  }

  function hasNode(id: DataGridTreeItemId) {
    const { nodeMap } = useStore.getState();
    return nodeMap.has(id);
  }

  function getById(id: DataGridTreeItemId): DataGridTreeNode<Item> {
    const { nodeMap } = useStore.getState();
    const node = nodeMap.get(id);

    if (!node) {
      throw new Error(`Node with id "${id}" not found`);
    }

    return node;
  }

  function getIndex(id: DataGridTreeItemId) {
    const node = getById(id);
    return getChildren(node.parentId).findIndex((child) => child.id === id);
  }

  function getPath(id: DataGridTreeItemId): DataGridTreeNode<Item>[] {
    const node = getById(id);
    const path: DataGridTreeNode<Item>[] = [];
    let current: DataGridTreeNode<Item> | null = node;

    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    return path;
  }

  function getLevel(id: DataGridTreeItemId) {
    return getPath(id).length;
  }

  function getSiblingCount(id: DataGridTreeItemId) {
    const node = getNode(id);
    if (!node) return 1;
    return getChildren(node.parentId).length;
  }

  function getSiblingPosition(id: DataGridTreeItemId) {
    const node = getNode(id);
    if (!node) return 1;
    return getChildren(node.parentId).findIndex((child) => child.id === id) + 1;
  }

  function getChildren(id: DataGridTreeParentId): DataGridTreeNode<Item>[] {
    const { childrenMap } = useStore.getState();
    const children = childrenMap.get(id);
    return children ?? [];
  }

  function forEach(callback: (node: DataGridTreeNode<Item>) => void) {
    for (const node of eachNode()) {
      callback(node);
    }
  }

  function* eachNode() {
    const stack: DataGridTreeNode<Item>[] = [...getRootNodes()].reverse();

    while (stack.length > 0) {
      const node = stack.pop()!;
      yield node;
      stack.push(...[...node.children].reverse());
    }
  }
}

/**
 * Hook to create and memoize tree structure.
 * Prevents recreation of tree structure on every render.
 *
 * @example
 * ```tsx
 * function MyTreeComponent() {
 *   const treeStructure = useDataGridTreeStructure({
 *     items,
 *     itemKey: 'id',
 *     parentKey: 'parentId',
 *   });
 *
 *   return <Tree name="my-tree" treeStructure={treeStructure} />;
 * }
 * ```
 */
export function useDataGridTreeStructure<Item extends DataGridTreeItem>(
  config: DataGridTreeStructureConfig<Item>,
): DataGridTreeStructure<Item> {
  const [treeStructure] = useState(() => createDataGridTreeStructure<Item>(config));

  return treeStructure;
}
