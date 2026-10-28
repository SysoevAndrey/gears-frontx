import type { DataGridItem } from '../../../../../data-grid-types';
import { applyCellTextTransformation, getCellValue } from '../export-cells';
import type {
  DataGridExcelJsApi,
  DataGridExcelJsModule,
  DataGridExportFormatter,
  DataGridExportFormatterParams,
} from '../export-types';

export const excelFormatter: DataGridExportFormatter = async <Item extends DataGridItem>(
  exportContext: DataGridExportFormatterParams<Item>,
): Promise<Blob> => {
  const { data, columns, options, gridContext } = exportContext;

  if (!options.loadExcelJs) {
    throw new Error(
      'Exporting to Excel needs `loadExcelJs`, a function that loads the exceljs package: the grid does not import it itself.',
    );
  }
  const excelJs = resolveExcelJs(await options.loadExcelJs());

  const workbook = new excelJs.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName);

  const includeHeaders = options.includeHeaders ?? true;
  let currentRow = 1;

  if (includeHeaders) {
    const headerRow = worksheet.getRow(currentRow);

    columns.forEach((column, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = column.label;
    });

    currentRow++;
  }

  for (const item of data) {
    const row = worksheet.getRow(currentRow);

    for (const [columnIndex, column] of columns.entries()) {
      const cellValue = getCellValue(item, column);

      const transformedValue = applyCellTextTransformation({
        item,
        column,
        cellValue,
        transformCellText: options.transformCellText,
        gridContext,
      });

      const cell = row.getCell(columnIndex + 1);

      cell.value = processExcelValue(cellValue.raw, transformedValue);
    }

    currentRow++;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

function hasDefault(module: DataGridExcelJsModule): module is { default: DataGridExcelJsApi } {
  return 'default' in module && !!module.default;
}

// A CommonJS package imported dynamically arrives as the module itself under one bundler and as
// `{ default: module }` under another, so the loader's result is read either way.
function resolveExcelJs(module: DataGridExcelJsModule): DataGridExcelJsApi {
  const api = hasDefault(module) ? module.default : module;
  if (typeof api.Workbook !== 'function') {
    throw new Error('`loadExcelJs` has to resolve to the exceljs package, which exports `Workbook`.');
  }
  return api;
}

export function processExcelValue(
  rawValue: unknown,
  transformedValue: string,
): string | number | boolean | Date {
  if (transformedValue !== String(rawValue ?? '')) {
    return transformedValue;
  }

  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  if (typeof rawValue === 'number') {
    return rawValue;
  }

  if (typeof rawValue === 'boolean') {
    return rawValue;
  }

  if (rawValue instanceof Date) {
    return rawValue;
  }

  if (typeof rawValue === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
    if (dateRegex.test(rawValue)) {
      const date = new Date(rawValue);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    const trimmed = rawValue.trim();
    if (
      trimmed !== '' &&
      !isNaN(Number(trimmed)) &&
      !/[eE]/.test(trimmed) &&
      !(trimmed.length > 1 && trimmed.startsWith('0') && trimmed[1] !== '.')
    ) {
      return Number(trimmed);
    }
  }

  return String(rawValue);
}
