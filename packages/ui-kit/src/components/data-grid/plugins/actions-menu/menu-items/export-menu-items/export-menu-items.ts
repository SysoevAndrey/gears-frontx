// `.js` on each relative import: they land verbatim in the shipped declaration file, where
// `moduleResolution: "nodenext"` rejects an extensionless one and the type behind it goes untyped.
import type { DataGridItem } from '../../../../data-grid-types.js';
import type { DataGridActionsMenuItemOption } from '../../actions-menu-types.js';
import { DataGridExportMenuItem } from './data-grid-export-menu-item';
import type { DataGridExportOptions } from './export-types.js';

/**
 * The items that export the grid's rows: Excel, when `loadExcelJs` is given, and CSV. Both read the
 * whole data set, not just the page on screen.
 */
export function exportMenuItems<Item extends DataGridItem = DataGridItem>(
  config?: Partial<DataGridExportOptions<Item>>,
): DataGridActionsMenuItemOption[] {
  const csv: DataGridActionsMenuItemOption = {
    component: DataGridExportMenuItem,
    params: { type: 'csv', exportConfig: config },
  };

  // exceljs is the consumer's to load, so an Excel item with no way to load it would only fail.
  if (!config?.loadExcelJs) return [csv];

  return [{ component: DataGridExportMenuItem, params: { type: 'xlsx', exportConfig: config } }, csv];
}
