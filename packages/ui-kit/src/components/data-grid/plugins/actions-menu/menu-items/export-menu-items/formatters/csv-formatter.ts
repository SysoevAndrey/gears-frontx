import type { DataGridItem } from '../../../../../data-grid-types';
import { applyCellTextTransformation, getCellValue } from '../export-cells';
import type { DataGridExportFormatter, DataGridExportFormatterParams } from '../export-types';

export const csvFormatter: DataGridExportFormatter = <Item extends DataGridItem>(
  exportContext: DataGridExportFormatterParams<Item>,
): Promise<string> => {
  const { data, columns, options, gridContext } = exportContext;
  const delimiter = options.delimiter || ',';
  const includeHeaders = options.includeHeaders ?? true;
  const rows: string[] = [];

  if (includeHeaders) {
    const headerRow = columns
      .map((column) => escapeCsvValue(column.label, delimiter))
      .join(delimiter);
    rows.push(headerRow);
  }

  for (const item of data) {
    const row: string[] = [];

    for (const column of columns) {
      const cellValue = getCellValue(item, column);

      const transformedValue = applyCellTextTransformation({
        item,
        column,
        cellValue,
        transformCellText: options.transformCellText,
        gridContext,
      });

      row.push(escapeCsvValue(transformedValue, delimiter));
    }

    rows.push(row.join(delimiter));
  }

  return Promise.resolve(rows.join('\n'));
};

const csvInjectionChars = /^[=+\-@\t\r]/;

function escapeCsvValue(value: string, delimiter: string): string {
  const stringValue = String(value ?? '');

  const needsQuoting =
    stringValue.includes(delimiter) ||
    stringValue.includes('\n') ||
    stringValue.includes('"') ||
    csvInjectionChars.test(stringValue);

  if (needsQuoting) {
    const escaped = stringValue.replace(/"/g, '""');
    // Prefix with tab to prevent CSV injection (CWE-1236) when value starts with a formula character
    const prefix = csvInjectionChars.test(stringValue) ? '\t' : '';
    return `"${prefix}${escaped}"`;
  }

  return stringValue;
}
