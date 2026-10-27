import type { KeyboardEvent, MouseEvent } from 'react';
import type { DataGridItem } from '../../data-grid-types';
import { IGNORE_CLICK_ATTRIBUTE } from '../../services/table/ignore-row-click';
import type { DataGridRowClickCallback } from './row-click-plugin';

const IGNORE_CLICK_SELECTOR = `[${IGNORE_CLICK_ATTRIBUTE}]`;

/**
 * Accepts a getter so the callback is read at event time from the mutable plugin API,
 * avoiding stale closures when onPropsChange updates the API without re-rendering the row.
 */
export function getClickListener<TItem extends DataGridItem>(
  item: TItem,
  getCb: () => DataGridRowClickCallback<TItem> | undefined,
) {
  return (event: MouseEvent | KeyboardEvent) => {
    const cb = getCb();
    if (!cb) return;
    if (event.target instanceof HTMLElement || event.target instanceof SVGElement) {
      if (event.target.closest(IGNORE_CLICK_SELECTOR)) {
        return;
      }
    }
    cb(item);
  };
}
