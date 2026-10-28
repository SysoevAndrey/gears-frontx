import type { DataGridItemId, DataGridRecord } from '../../services/storage/storage-types';
import { isRecord } from '../../utils/is-record';

// What a row puts in the drag data (`getInitialData`) and a drop target reads back is typed
// `unknown` by the drag library, so each read goes through one of these guards instead of a cast.

function isDataGridItemId(value: unknown): value is DataGridItemId {
  return typeof value === 'string' || typeof value === 'number';
}

function isDataGridRecord(value: unknown): value is DataGridRecord {
  return isRecord(value) && isDataGridItemId(value.id) && isRecord(value.item);
}

/** The record a dragged row or a row used as a drop target carries, or nothing for any other data. */
export function readRecord(data: Record<string | symbol, unknown>): DataGridRecord | undefined {
  return isDataGridRecord(data.record) ? data.record : undefined;
}
