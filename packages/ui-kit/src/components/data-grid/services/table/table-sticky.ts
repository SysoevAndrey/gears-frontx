import type { StoreApi } from 'zustand';
import type { UseBoundStore } from 'zustand/react';
import type { DataGridItem } from '../../data-grid-types';
import type { ExtraColumn, DataGridTableColumn, DataGridTableGroup, TableStore } from './table-types';
import { isTableGroup } from './table-types';

/** The slice of the table store the inline-end offsets are derived from. */
type EndStickyState = Pick<TableStore, 'extraColumnsEnd' | 'columnWidths'>;

/** The slice of the table store that says whether a start extra column pins, and where. */
type StartExtraStickyState<TItem extends DataGridItem> = Pick<
  TableStore<TItem>,
  'extraColumnsStart' | 'columns' | 'flatColumns' | 'columnVisibility' | 'columnSticky' | 'groupSticky'
>;

/** A registered `width` the inline-end arithmetic can use: a plain px length, nothing else. */
const pxWidthRe = /^\s*(\d+(?:\.\d+)?)px\s*$/;

export type TableStickyService<TItem extends DataGridItem = DataGridItem> = ReturnType<
  typeof prepareTableSticky<TItem>
>;

export function prepareTableSticky<TItem extends DataGridItem = DataGridItem>(
  useTableStore: UseBoundStore<StoreApi<TableStore<TItem>>>,
) {
  return {
    initializeStickyState,
    getOrderedColumnsWithSticky,
    onResizeColumn,
    isColumnSticky,
    isGroupSticky,
    useColumnStickyOffset,
    useColumnEndStickyOffset,
    useGroupStickyOffset,
  };

  function initializeStickyState(columns: (DataGridTableColumn<TItem> | DataGridTableGroup<TItem>)[]): {
    columnSticky: Map<string, boolean>;
    groupSticky: Map<string, boolean>;
  } {
    const columnSticky = new Map<string, boolean>();
    const groupSticky = new Map<string, boolean>();

    for (const item of columns) {
      if (isTableGroup(item)) {
        groupSticky.set(item.id, item.sticky ?? false);
        for (const col of item.columns) {
          columnSticky.set(col.id, col.sticky ?? item.sticky ?? false);
        }
      } else {
        columnSticky.set(item.id, item.sticky ?? false);
      }
    }

    return { columnSticky, groupSticky };
  }

  function getOrderedColumnsWithSticky(
    visibleColumns: DataGridTableColumn<TItem>[],
    columnSticky: Map<string, boolean>,
  ): DataGridTableColumn<TItem>[] {
    const sticky: DataGridTableColumn<TItem>[] = [];
    const nonSticky: DataGridTableColumn<TItem>[] = [];

    for (const col of visibleColumns) {
      if (columnSticky.get(col.id)) {
        sticky.push(col);
      } else {
        nonSticky.push(col);
      }
    }

    return [...sticky, ...nonSticky];
  }

  // Skips the write when the width is unchanged. This is what ends the header's observer cycle: a
  // new `columnWidths` Map is a new store state, which gives `useFirstRowHeaderCells` a new array,
  // which re-creates the header's ResizeObserver, and a fresh observer always reports once on
  // `observe()` -- so an unconditional write here would rebuild the observer on every frame.
  function onResizeColumn(columnId: string, width: number) {
    const current = useTableStore.getState().columnWidths;
    if (current.get(columnId) === width) return;

    const newWidths = new Map(current);
    newWidths.set(columnId, width);
    useTableStore.setState({ columnWidths: newWidths });
  }

  function isColumnSticky(columnId: string) {
    return useTableStore.getState().columnSticky.get(columnId) === true;
  }

  function isGroupSticky(groupId: string) {
    return useTableStore.getState().groupSticky.get(groupId) === true;
  }

  function useColumnStickyOffset(columnId: string): number | undefined {
    return useTableStore((s) => {
      if (!s.columnSticky.get(columnId)) return getStartExtraStickyOffset(s, columnId);

      let offset = getExtraStartOffset(s);
      const visibleCols = s.flatColumns.filter((c) => s.columnVisibility.get(c.id) !== false);
      for (const col of visibleCols) {
        if (col.id === columnId) break;
        if (s.columnSticky.get(col.id)) {
          offset += s.columnWidths.get(col.id) ?? 0;
        }
      }
      return offset;
    });
  }

  function useColumnEndStickyOffset(columnId: string): number | undefined {
    return useTableStore((s) => getEndStickyOffset(s, columnId));
  }

  function useGroupStickyOffset(groupId: string): number | undefined {
    return useTableStore((s) => {
      if (!s.groupSticky.get(groupId)) return undefined;

      let offset = getExtraStartOffset(s);
      const visibleCols = s.flatColumns.filter((c) => s.columnVisibility.get(c.id) !== false);
      for (const col of visibleCols) {
        if (col.groupId === groupId) break;
        if (s.columnSticky.get(col.id)) {
          offset += s.columnWidths.get(col.id) ?? 0;
        }
      }
      return offset;
    });
  }

  function getExtraStartOffset(s: TableStore<TItem>) {
    let offset = 0;
    for (const extra of s.extraColumnsStart) {
      offset += startExtraWidth(extra);
    }
    return offset;
  }
}

function startExtraWidth(extra: ExtraColumn): number {
  return extra.width ? parseInt(extra.width, 10) || 0 : 0;
}

/**
 * Offset from the table's inline-start edge for an extra `start` column (a row number, a
 * checkbox), or `undefined` when it does not pin.
 *
 * A pinned data column or group is offset by the width of every start extra column, so the extra
 * columns have to be pinned in front of it: left unpinned they scroll away and leave that width
 * empty. They pin together with the first pinned data column and not before it, so a grid that pins
 * nothing scrolls its extra columns away with the rest. A pinned column that is hidden pins nothing.
 * Each one sits behind the extra columns before it, in the order they are drawn.
 *
 * The widths are read the way the data columns' own offset reads them (the registered `width`), so
 * the two sums always agree. Pure and store-shaped, like `getEndStickyOffset`.
 */
export function getStartExtraStickyOffset<TItem extends DataGridItem>(
  s: StartExtraStickyState<TItem>,
  columnId: string,
): number | undefined {
  if (!s.extraColumnsStart.some((extra) => extra.id === columnId) || !hasStartPinnedData(s)) {
    return undefined;
  }

  let offset = 0;
  for (const extra of s.extraColumnsStart) {
    if (extra.id === columnId) return offset;
    offset += startExtraWidth(extra);
  }

  return undefined;
}

function hasStartPinnedData<TItem extends DataGridItem>(s: StartExtraStickyState<TItem>): boolean {
  const isVisible = (column: DataGridTableColumn<TItem>) => s.columnVisibility.get(column.id) !== false;

  return (
    s.flatColumns.some((column) => isVisible(column) && s.columnSticky.get(column.id)) ||
    s.columns.some(
      (item) => isTableGroup(item) && s.groupSticky.get(item.id) && item.columns.some(isVisible),
    )
  );
}

/**
 * Offset from the table's inline-end edge for a pinned `end` extra column, or `undefined` when
 * the column is not an `end` column that pins.
 *
 * Walked right to left so each pinned column sits outside the ones already pinned beyond it,
 * mirroring how the start-edge offsets accumulate left to right. Unpinned columns in between
 * contribute nothing -- they scroll away, so the pinned ones stack against each other.
 *
 * Pure and store-shaped rather than a hook body so the arithmetic is directly testable, and so
 * `useColumnEndStickyOffset` returns a plain number: a `Map` built inside a zustand selector would be a
 * fresh reference on every store read and re-render forever.
 */
export function getEndStickyOffset(s: EndStickyState, columnId: string): number | undefined {
  let offset = 0;

  for (let index = s.extraColumnsEnd.length - 1; index >= 0; index--) {
    const column = s.extraColumnsEnd[index];
    if (!column.sticky) continue;
    if (column.id === columnId) return offset;
    offset += resolveExtraColumnWidth(s, column);
  }

  return undefined;
}

/**
 * The measured header width wins over the registered one: an auto-sized extra column registers a
 * width computed from its own content, while the header's ResizeObserver reports the track the
 * table actually gave the cell. Stacking on the registered value would drift the outer pinned
 * columns by the difference.
 *
 * The registered value is used only when it is a plain px length. `width` is handed straight to
 * CSS, where `4rem` and `10%` are perfectly good column widths, so the field cannot be narrowed to
 * px without taking those away -- but this arithmetic is pixels, and reading them with `parseInt`
 * would call them `4` and `10` and pin the columns inside them a few pixels from the edge instead
 * of clear of the column. An unreadable width contributes `0` instead: the same as a pinned column
 * with no width at all, and true only until the header's ResizeObserver reports the real track.
 */
function resolveExtraColumnWidth(s: EndStickyState, column: ExtraColumn): number {
  const measured = s.columnWidths.get(column.id);
  if (measured !== undefined) return measured;

  const px = pxWidthRe.exec(column.width ?? '');
  return px ? Number(px[1]) : 0;
}
