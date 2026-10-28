// `.js` on each relative import: they land verbatim in the shipped declaration file, where
// `moduleResolution: "nodenext"` rejects an extensionless one and the type behind it goes untyped.
import type { DataGridItem } from '../../../../data-grid-types.js';
import type { DataGridPluginContext } from '../../../../services/plugins/plugins-types.js';

export type DataGridExportFormat = 'csv' | 'xlsx';

export type DataGridExportCellTextTransformer<Item extends DataGridItem> = (
  cell: {
    value: unknown;
    formattedValue: string;
    row: Item;
  },
  gridContext: DataGridPluginContext<Item>,
) => string;

export type DataGridExportTransformCellTextMap<Item extends DataGridItem> = Record<
  string,
  DataGridExportCellTextTransformer<Item>
>;

/**
 * The part of an exceljs cell the export writes. A cell's `value` takes more shapes than the
 * export ever gives it, so it is `unknown` here, which an exceljs `Cell` satisfies.
 */
export interface DataGridExcelJsCell {
  value: unknown;
}

export interface DataGridExcelJsRow {
  getCell: (column: number) => DataGridExcelJsCell;
}

export interface DataGridExcelJsWorksheet {
  getRow: (row: number) => DataGridExcelJsRow;
}

export interface DataGridExcelJsWorkbook {
  addWorksheet: (name?: string) => DataGridExcelJsWorksheet;
  xlsx: { writeBuffer: () => Promise<ArrayBuffer> };
}

/** The part of the `exceljs` package the export uses: the `Workbook` class. */
export interface DataGridExcelJsApi {
  Workbook: new () => DataGridExcelJsWorkbook;
}

/**
 * What `import('exceljs')` resolves to, spelled out here so that the kit's types never name
 * `exceljs`, which a consumer that does not export to Excel does not have installed. Depending on
 * the bundler the package arrives as the module itself or under `default`; both are accepted.
 */
export type DataGridExcelJsModule = DataGridExcelJsApi | { default: DataGridExcelJsApi };

export interface DataGridExportOptions<Item extends DataGridItem = DataGridItem> {
  format?: DataGridExportFormat;
  filename?: string | (() => string);
  transformCellText?: DataGridExportTransformCellTextMap<Item>;
  onError?: (error: Error) => void;
  includeHeaders?: boolean;
  delimiter?: string;
  encoding?: string;
  sheetName?: string;
  /**
   * Loads the `exceljs` package, which the kit does not import itself: a bundler resolves a
   * dynamic import when it builds the kit's consumer, and a consumer without `exceljs` would fail
   * to build. Pass `() => import('exceljs')`, with `exceljs` 4.4.0 installed. Without it
   * `exportMenuItems` offers CSV only.
   */
  loadExcelJs?: () => Promise<DataGridExcelJsModule>;
}

export interface DataGridExportColumn {
  id: string;
  label: string;
  key?: string;
  formatter?: (value: unknown) => string;
}

export interface DataGridExportService<Item extends DataGridItem> {
  exportToCSV: (
    data: Item[],
    columns: DataGridExportColumn[],
    options: DataGridExportOptions<Item>,
    gridContext: DataGridPluginContext<Item>,
  ) => Promise<void>;

  exportToExcel: (
    data: Item[],
    columns: DataGridExportColumn[],
    options: DataGridExportOptions<Item>,
    gridContext: DataGridPluginContext<Item>,
  ) => Promise<void>;

  downloadFile: (content: string | Blob, filename: string, mimeType: string) => void;

  getAllData: (gridContext: DataGridPluginContext<Item>) => Promise<Item[]>;
}

export interface DataGridExportFormatterParams<Item extends DataGridItem> {
  data: Item[];
  columns: DataGridExportColumn[];
  options: DataGridExportOptions<Item>;
  gridContext: DataGridPluginContext<Item>;
}

export type DataGridExportFormatter = <Item extends DataGridItem>(
  context: DataGridExportFormatterParams<Item>,
) => Promise<string | Blob>;
