export type DataGridTreeItemId = string | number;
export type DataGridTreeParentId = DataGridTreeItemId | null;
export type DataGridTreeItemKey<Item extends DataGridTreeItem> =
  DataGridTreeItemId | ((item: Item) => DataGridTreeItemId);
export type DataGridTreeParentKey<Item extends DataGridTreeItem> =
  DataGridTreeItemId | ((item: Item) => DataGridTreeParentId | undefined);
export type DataGridTreeChildrenKey<Item extends DataGridTreeItem> =
  DataGridTreeItemId | ((item: Item) => Item[] | null | undefined);
export type DataGridTreeItem = Record<DataGridTreeItemId, unknown>;

export interface DataGridTreeNode<Item extends DataGridTreeItem = DataGridTreeItem> {
  id: DataGridTreeItemId;
  parentId: DataGridTreeParentId;
  isLeaf: boolean;
  parent: DataGridTreeNode<Item> | null;
  item: Item;
  children: DataGridTreeNode<Item>[];
}

export type DataGridTreeStructureConfig<Item extends DataGridTreeItem> = {
  /**
   * Initial items
   */
  items?: Item[];
  /**
   * If string - it will be used as "key" to get value from item
   * If function - result of the function will be used as a unique key
   */
  itemKey?: DataGridTreeItemKey<Item>;
  /**
   * Determines whether an item is leaf (has no children)
   */
  isLeaf?: (item: Item) => boolean;
} & (
  | {
      /**
       * If string - it will be used as "key" to get value from item
       * If function - result of the function will be used as a parent id
       */
      parentKey?: DataGridTreeParentKey<Item>;
      childrenKey?: never;
    }
  | {
      /**
       * If string - it will be used as "key" to get children array from item
       * If function - result of the function will be used as children ids
       */
      childrenKey: DataGridTreeChildrenKey<Item>;
      parentKey?: never;
    }
);

export interface DataGridTreeMoveParams {
  /**
   * Move this id
   */
  id: DataGridTreeItemId;
  /**
   * New parent id (where to move)
   */
  parentId: DataGridTreeParentId;
  /**
   * Insert at the specified index
   * @default children.length
   */
  position?: number;
}

export type InferDataGridTreeItem<Structure extends DataGridTreeStructure<DataGridTreeItem>> =
  NonNullable<ReturnType<Structure['useNode']>>['item'];

export interface DataGridTreeStructureStore<Item extends DataGridTreeItem> {
  nodeMap: Map<DataGridTreeItemId, DataGridTreeNode<Item>>;
  childrenMap: Map<DataGridTreeParentId, DataGridTreeNode<Item>[]>;
}

export interface DataGridTreeStructure<Item extends DataGridTreeItem> {
  setItems: (items: Item[]) => void;
  move: (params: DataGridTreeMoveParams) => void;

  forEach: (callback: (node: DataGridTreeNode<Item>) => void) => void;
  eachNode: () => Generator<DataGridTreeNode<Item>, void, unknown>;

  // Non-hook getters (safe to call outside React components)
  getNode: (id: DataGridTreeItemId) => DataGridTreeNode<Item> | undefined;
  getChildren: (parentId: DataGridTreeParentId) => readonly DataGridTreeNode<Item>[];
  getRootNodes: () => readonly DataGridTreeNode<Item>[];
  getNodes: () => readonly DataGridTreeNode<Item>[];
  getLevel: (id: DataGridTreeItemId) => number;
  getSiblingCount: (id: DataGridTreeItemId) => number;
  getSiblingPosition: (id: DataGridTreeItemId) => number;
  isDescendantOf: (descendantId: DataGridTreeItemId, parentId: DataGridTreeItemId) => boolean;

  useRootNodes: () => readonly DataGridTreeNode<Item>[];
  useNodes: () => readonly DataGridTreeNode<Item>[];
  useNodesCount: () => number;
  useNode: (id: DataGridTreeItemId) => DataGridTreeNode<Item> | undefined;
  useHasNode: (id: DataGridTreeItemId) => boolean;
  useChildren: (parentId: DataGridTreeParentId) => readonly DataGridTreeNode<Item>[];
  useNodePath: (id: DataGridTreeItemId) => readonly DataGridTreeNode<Item>[];
  useNodeLevel: (id: DataGridTreeItemId) => number;
  useNodeIndex: (id: DataGridTreeItemId) => number;
  useIsLeaf: (id: DataGridTreeItemId) => boolean;
  useIsDescendantOf: (descendantId: DataGridTreeItemId, parentId: DataGridTreeItemId) => boolean;
}
