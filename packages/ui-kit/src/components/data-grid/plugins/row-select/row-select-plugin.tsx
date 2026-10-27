// Load-bearing: a plugin is rendered as a child of <DataGrid>, so a Server Component can import
// and render it, and the component it returns calls hooks. This directive puts the banner on the
// plugin's own entry chunk (dist/data-grid/<plugin>.js). client-boundaries.test.ts only scans a
// component's top-level files, so scripts/verify-consumer.sh is what checks the built banner of
// every plugin entry.
'use client';

import type { ReactNode } from 'react';
import { create } from 'zustand';
import type { DataGridItem } from '../../data-grid-types';
import { createDataGridPlugin } from '../../services/plugins/plugins-helpers';
import type { DataGridItemId, DataGridRecord } from '../../services/storage/storage-types';
import { DataGridRowSelectBody } from './components/data-grid-row-select-body';
import { DataGridRowSelectHeader } from './components/data-grid-row-select-header';
import { DataGridRowSelectTop } from './components/data-grid-row-select-top';
import type {
  DataGridRowSelectChangeMeta,
  DataGridRowSelectDescriptor,
  DataGridRowSelectMode,
  DataGridRowSelectPluginApi,
  DataGridRowSelectPluginProps,
  RowSelectConfigStore,
  RowSelectStore,
} from './row-select-types';

const rowSelectSlotId = 'row-select';
const defaultSlotId = 'default';

const DataGridRowSelectPluginRaw = createDataGridPlugin<
  DataGridItem,
  'rowSelect',
  DataGridRowSelectPluginProps
>('rowSelect', (context) => {
  const useRowSelectStore = create<RowSelectStore>(() => ({
    selectedIds: new Set(),
    selectAllMatching: false,
    total: 0,
  }));

  const useConfigStore = create<RowSelectConfigStore>(() => ({
    multiple: true,
    showSelectAll: true,
    showSelectAllMatching: false,
    keepHiddenSelection: false,
    visible: undefined,
    onSelectionChange: undefined,
    component: undefined,
    statusComponent: undefined,
  }));

  // In `keepHiddenSelection` mode this holds the selected items across pages so
  // `onSelectionChange` can report rows that are no longer visible. Untouched in
  // the default (page-scoped) mode, where selected items come from the visible
  // records instead.
  const selectedItemsById = new Map<DataGridItemId, DataGridItem>();

  // Register extra column with checkboxes
  context.registerExtraColumn({
    position: 'start',
    order: 5,
    width: '40px',
    header: DataGridRowSelectHeader,
    body: DataGridRowSelectBody,
    // Selecting a row via its checkbox must never also fire the row-click
    // callback. Marking the whole cell (not just the checkbox) covers the
    // checkbox, its label, and the cell padding.
    ignoreRowClick: true,
  });

  // Mirror the total matching count from the load result. This is the same value
  // the pagination plugin surfaces (both read `processResult.total`); reading it
  // here keeps the plugin independent of plugin registration order.
  context.hook('load:store', (instance) => {
    // Reset to 0 when a load omits `total` so a stale count from a previous
    // load never leaks; `useTotalCount` then falls back to the visible count.
    const total = instance.processResult?.total ?? 0;
    if (total !== useRowSelectStore.getState().total) {
      useRowSelectStore.setState({ total });
    }
  });

  // Selection is page-scoped (Gmail-style): "Select all N matching" is meant for
  // an immediate bulk action on the current filter, not for paging through. When
  // the visible records change (pagination, filter, search, or reload) the stale
  // selection is pruned and all-matching mode is left, so navigating pages starts
  // fresh.
  let prevVisibleRecordIds = new Set<DataGridItemId>();

  context.useStore.subscribe((state) => {
    const currentIds = new Set(state.visibleRecords.map((r) => r.id));
    const idsChanged = !setsEqual(currentIds, prevVisibleRecordIds);
    prevVisibleRecordIds = currentIds;

    const { selectedIds, selectAllMatching: selectAllMatchingActive } =
      useRowSelectStore.getState();
    if (selectedIds.size === 0 && !selectAllMatchingActive) return;

    const nextState: Partial<RowSelectStore> = {};

    // Any reload/data change leaves all-matching mode — even one that returns the
    // same ids under a different filter (selection is page-scoped).
    if (selectAllMatchingActive) nextState.selectAllMatching = false;

    // Prune stale explicit ids only when the visible set actually changed. In
    // keepHiddenSelection mode selections deliberately outlive the page, so
    // explicit ids are never pruned.
    if (idsChanged && selectedIds.size > 0 && !useConfigStore.getState().keepHiddenSelection) {
      const pruned = new Set<DataGridItemId>();
      for (const id of selectedIds) {
        if (currentIds.has(id)) {
          pruned.add(id);
        }
      }
      if (pruned.size !== selectedIds.size) nextState.selectedIds = pruned;
    }

    if (Object.keys(nextState).length === 0) return;

    useRowSelectStore.setState(nextState);
    emitSelection();
  });

  let topSlotRegistered = false;

  const api: DataGridRowSelectPluginApi = {
    useSelectedIds,
    useIsSelected,
    useMultiple,
    useShowSelectAll,
    useShowSelectAllMatching,
    useComponent,
    useStatusComponent,
    useIsAllSelected,
    useIsPartialSelected,
    useIsVisible,
    useIsSelectAllMatching,
    useSelectionMode,
    useSelectionCount,
    useTotalCount,
    useSelectableCount,
    useVisibleCount,
    toggleSelection,
    clearSelection,
    toggleSelectAll,
    selectAllMatching,
    getSelectionDescriptor,
  };

  return {
    ...api,
    onPropsChange,
  };

  function useSelectedIds() {
    return useRowSelectStore((s) => s.selectedIds);
  }

  function useIsSelected(itemId: DataGridItemId) {
    return useRowSelectStore((s) => s.selectedIds.has(itemId));
  }

  function useMultiple() {
    return useConfigStore((s) => s.multiple);
  }

  function useShowSelectAll() {
    return useConfigStore((s) => s.showSelectAll);
  }

  function useShowSelectAllMatching() {
    return useConfigStore((s) => s.showSelectAllMatching);
  }

  function useComponent() {
    return useConfigStore((s) => s.component);
  }

  function useStatusComponent() {
    return useConfigStore((s) => s.statusComponent);
  }

  function useIsAllSelected() {
    const selectedIds = useRowSelectStore((s) => s.selectedIds);
    const records = useSelectableRecords();
    // Scope to the visible page: in keepHiddenSelection mode `selectedIds` may
    // include off-page rows, so a raw size comparison would misreport.
    return records.length > 0 && records.every((r) => selectedIds.has(r.id));
  }

  function useIsPartialSelected() {
    const selectedIds = useRowSelectStore((s) => s.selectedIds);
    const records = useSelectableRecords();
    const selectedOnPage = records.filter((r) => selectedIds.has(r.id)).length;
    return selectedOnPage > 0 && selectedOnPage < records.length;
  }

  function useSelectableRecords() {
    const visible = useConfigStore((s) => s.visible);
    const records = context.useStore((s) => s.visibleRecords);
    return visible ? records.filter((r) => visible(r.item)) : records;
  }

  function useIsVisible(item: DataGridItem) {
    const visible = useConfigStore((s) => s.visible);
    return visible ? visible(item) : true;
  }

  function useIsSelectAllMatching() {
    return useRowSelectStore((s) => s.selectAllMatching);
  }

  function useSelectableCount() {
    const visible = useConfigStore((s) => s.visible);
    const records = context.useStore((s) => s.visibleRecords);
    return visible ? records.filter((r) => visible(r.item)).length : records.length;
  }

  function useVisibleCount() {
    return context.useStore((s) => s.visibleRecords.length);
  }

  function useTotalCount() {
    const total = useRowSelectStore((s) => s.total);
    const visibleCount = useVisibleCount();
    return total || visibleCount;
  }

  function useSelectionMode(): DataGridRowSelectMode {
    const size = useRowSelectStore((s) => s.selectedIds.size);
    const selectAllMatchingActive = useRowSelectStore((s) => s.selectAllMatching);
    return getMode(size, selectAllMatchingActive);
  }

  function useSelectionCount() {
    const size = useRowSelectStore((s) => s.selectedIds.size);
    const selectAllMatchingActive = useRowSelectStore((s) => s.selectAllMatching);
    const total = useTotalCount();
    return selectAllMatchingActive ? total : size;
  }

  function isVisible(item: DataGridItem) {
    const { visible } = useConfigStore.getState();
    return visible ? visible(item) : true;
  }

  function getVisibleSelectableRecords(): DataGridRecord[] {
    return context.useStore.getState().visibleRecords.filter((record) => isVisible(record.item));
  }

  function getTotal() {
    const { total } = useRowSelectStore.getState();
    return total || context.useStore.getState().visibleRecords.length;
  }

  function getMode(size: number, selectAllMatchingActive: boolean): DataGridRowSelectMode {
    if (selectAllMatchingActive) return 'all';
    return size > 0 ? 'page' : 'none';
  }

  function toggleSelectAll(value: boolean) {
    if (value) {
      selectAll();
    } else {
      clearSelection();
    }
  }

  function selectAll() {
    const records = getVisibleSelectableRecords();
    const { keepHiddenSelection } = useConfigStore.getState();
    // Keep-hidden mode adds the page to any cross-page selection; default mode
    // replaces the selection with the current page (unchanged behaviour).
    const newSelectedIds = new Set<DataGridItemId>(
      keepHiddenSelection ? useRowSelectStore.getState().selectedIds : [],
    );
    for (const record of records) {
      newSelectedIds.add(record.id);
      if (keepHiddenSelection) {
        selectedItemsById.set(record.id, record.item);
      }
    }
    useRowSelectStore.setState({ selectedIds: newSelectedIds, selectAllMatching: false });
    emitSelection();
  }

  function selectAllMatching() {
    const { showSelectAllMatching, multiple } = useConfigStore.getState();
    // All-matching is meaningless in single-selection mode.
    if (!showSelectAllMatching || !multiple) return;
    useRowSelectStore.setState({ selectAllMatching: true });
    emitSelection();
  }

  function toggleSelection(itemId: DataGridItemId) {
    const { selectedIds } = useRowSelectStore.getState();
    const { multiple, keepHiddenSelection } = useConfigStore.getState();
    const newSelectedIds = new Set(multiple ? selectedIds : []);

    if (selectedIds.has(itemId)) {
      newSelectedIds.delete(itemId);
    } else {
      newSelectedIds.add(itemId);
    }

    if (keepHiddenSelection) {
      if (!multiple) {
        selectedItemsById.clear();
      }
      if (newSelectedIds.has(itemId)) {
        const record = context.useStore.getState().visibleRecords.find((r) => r.id === itemId);
        if (record) {
          selectedItemsById.set(itemId, record.item);
        }
      } else {
        selectedItemsById.delete(itemId);
      }
    }

    // Any explicit row toggle leaves all-matching mode.
    useRowSelectStore.setState({ selectedIds: newSelectedIds, selectAllMatching: false });
    emitSelection();
  }

  function clearSelection() {
    useRowSelectStore.setState({ selectedIds: new Set(), selectAllMatching: false });
    selectedItemsById.clear();
    emitSelection();
  }

  function getSelectionDescriptor(): DataGridRowSelectDescriptor {
    const { selectedIds, selectAllMatching: selectAllMatchingActive } =
      useRowSelectStore.getState();
    if (selectAllMatchingActive) return { mode: 'all-matching' };
    return { mode: 'ids', ids: [...selectedIds] };
  }

  function emitSelection() {
    const { onSelectionChange, keepHiddenSelection } = useConfigStore.getState();
    if (!onSelectionChange) return;

    const { selectedIds, selectAllMatching: selectAllMatchingActive } =
      useRowSelectStore.getState();

    // Keep-hidden mode reports the retained cross-page items; default mode
    // reports only the rows selected on the visible page.
    const selectedItems: DataGridItem[] = [];
    if (keepHiddenSelection) {
      selectedItems.push(...selectedItemsById.values());
    } else {
      for (const record of context.useStore.getState().visibleRecords) {
        if (selectedIds.has(record.id)) {
          selectedItems.push(record.item);
        }
      }
    }

    const meta: DataGridRowSelectChangeMeta = {
      mode: getMode(selectedIds.size, selectAllMatchingActive),
      count: selectAllMatchingActive ? getTotal() : selectedIds.size,
    };

    onSelectionChange(selectedItems, meta);
  }

  function onPropsChange(props: DataGridRowSelectPluginProps) {
    useConfigStore.setState({
      multiple: props.multiple ?? true,
      showSelectAll: props.showSelectAll ?? true,
      showSelectAllMatching: props.showSelectAllMatching ?? false,
      keepHiddenSelection: props.keepHiddenSelection ?? false,
      visible: props.visible,
      onSelectionChange: props.onSelectionChange,
      component: props.component,
      statusComponent: props.statusComponent,
    });

    if ((props.component || props.statusComponent) && !topSlotRegistered) {
      registerTopSlot();
    }
  }

  function registerTopSlot() {
    if (topSlotRegistered) return;
    topSlotRegistered = true;

    context.registerSlot('top', {
      id: rowSelectSlotId,
      component: DataGridRowSelectTop,
    });

    // Subscribe to selection changes to toggle active slot
    useRowSelectStore.subscribe((state) => {
      const isSelectMode = state.selectedIds.size > 0;
      context.setActiveSlotId('top', isSelectMode ? rowSelectSlotId : defaultSlotId);
    });
  }
});

// The plugin is built for the base item type; the cast hands the consumer a generic component, so
// `<DataGridRowSelectPlugin<User> onSelectionChange={...} />` types the items it reports.
export const DataGridRowSelectPlugin = DataGridRowSelectPluginRaw as <
  TItem extends DataGridItem = DataGridItem,
>(
  props: DataGridRowSelectPluginProps<TItem>,
) => ReactNode;

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
