import type { DataGridItem } from '../../../../data-grid-types';
import type { DataGridPluginContext } from '../../../../services/plugins/plugins-types';
import type { DataGridExportColumn, DataGridExportOptions } from './export-types';

// What a formatter does to one cell, apart from the service that uses the formatters: the service
// imports them, so they cannot import it back.

export function getCellValue<Item extends DataGridItem = DataGridItem>(
  item: Item,
  column: DataGridExportColumn,
): { raw: unknown; formatted: string } {
  const rawValue = column.key ? item[column.key] : item[column.id];

  let formattedValue: string;
  if (column.formatter) {
    formattedValue = column.formatter(rawValue);
  } else {
    formattedValue = String(rawValue ?? '');
  }

  return { raw: rawValue, formatted: formattedValue };
}

export function applyCellTextTransformation<Item extends DataGridItem = DataGridItem>({
  item,
  column,
  cellValue,
  transformCellText,
  gridContext,
}: {
  item: Item;
  column: DataGridExportColumn;
  cellValue: { raw: unknown; formatted: string };
  transformCellText: DataGridExportOptions<Item>['transformCellText'];
  gridContext: DataGridPluginContext<Item>;
}): string {
  const transformer = transformCellText?.[column.id];

  if (!transformer) {
    return cellValue.formatted;
  }

  return transformer(
    {
      value: cellValue.raw,
      formattedValue: cellValue.formatted,
      row: item,
    },
    gridContext,
  );
}
