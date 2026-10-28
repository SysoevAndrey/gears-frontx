import * as ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createGridPluginContext } from '../../../../../../../__test-utils__/grid-plugin-context';
import type { DataGridPluginContext } from '../../../../../services/plugins/plugins-types';
import type {
  DataGridExcelJsApi,
  DataGridExcelJsModule,
  DataGridExportFormatterParams,
  DataGridExportOptions,
} from '../export-types';
import { excelFormatter, processExcelValue } from './excel-formatter';

describe('processExcelValue', () => {
  it('returns transformed value when it differs from raw', () => {
    expect(processExcelValue(100, 'custom')).toBe('custom');
  });

  it('preserves number values', () => {
    expect(processExcelValue(42, '42')).toBe(42);
  });

  it('preserves boolean values', () => {
    expect(processExcelValue(true, 'true')).toBe(true);
    expect(processExcelValue(false, 'false')).toBe(false);
  });

  it('preserves Date values', () => {
    const date = new Date('2024-01-15');
    expect(processExcelValue(date, date.toString())).toEqual(date);
  });

  it('converts date strings to Date objects', () => {
    const result = processExcelValue('2024-01-15', '2024-01-15');
    expect(result).toBeInstanceOf(Date);
  });

  it('converts ISO date strings to Date objects', () => {
    const result = processExcelValue('2024-01-15T10:30:00', '2024-01-15T10:30:00');
    expect(result).toBeInstanceOf(Date);
  });

  it('converts numeric strings to numbers', () => {
    expect(processExcelValue('42', '42')).toBe(42);
    expect(processExcelValue('3.14', '3.14')).toBe(3.14);
  });

  it('returns empty string for null', () => {
    expect(processExcelValue(null, '')).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(processExcelValue(undefined, '')).toBe('');
  });

  it('returns string for non-special string values', () => {
    expect(processExcelValue('hello', 'hello')).toBe('hello');
  });

  it('does not convert empty strings to numbers', () => {
    expect(processExcelValue('  ', '  ')).toBe('  ');
  });

  it('preserves strings with leading zeros (zip codes, SKUs)', () => {
    expect(processExcelValue('007', '007')).toBe('007');
    expect(processExcelValue('00123', '00123')).toBe('00123');
  });

  it('converts single zero string to number', () => {
    expect(processExcelValue('0', '0')).toBe(0);
  });

  it('converts decimal strings starting with 0. to numbers', () => {
    expect(processExcelValue('0.5', '0.5')).toBe(0.5);
  });

  it('does not match date-like slugs as dates', () => {
    const result = processExcelValue('2024-01-15-my-slug', '2024-01-15-my-slug');
    expect(result).toBe('2024-01-15-my-slug');
  });

  it('does not match date strings with trailing content', () => {
    const result = processExcelValue('2024-01-15T00:00:00 extra', '2024-01-15T00:00:00 extra');
    expect(result).toBe('2024-01-15T00:00:00 extra');
  });
});

interface Row {
  id: number;
  name: string;
  amount: string;
  joined: string;
}

let gridContext: DataGridPluginContext<Row>;

beforeAll(async () => {
  gridContext = await createGridPluginContext<Row>([
    { id: 0, name: 'Placeholder', amount: '0', joined: '2024-01-01' },
  ]);
});

const rows: Row[] = [
  { id: 1, name: 'Alice', amount: '12.5', joined: '2024-01-15' },
  { id: 2, name: 'Bob', amount: '007', joined: '2023-12-31' },
];

function params(options: DataGridExportOptions<Row>): DataGridExportFormatterParams<Row> {
  return {
    data: rows,
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'amount', label: 'Amount' },
      { id: 'joined', label: 'Joined' },
    ],
    options,
    gridContext,
  };
}

// A workbook of the shape the export writes to, recording what it was given.
function createFakeExcelJs() {
  const written = new Map<string, unknown>();
  const sheets: (string | undefined)[] = [];

  class FakeWorkbook {
    xlsx = { writeBuffer: () => Promise.resolve(new ArrayBuffer(8)) };

    addWorksheet(name?: string) {
      sheets.push(name);
      return {
        getRow: (row: number) => ({
          getCell: (column: number) => ({
            set value(value: unknown) {
              written.set(`${row}:${column}`, value);
            },
            get value() {
              return written.get(`${row}:${column}`);
            },
          }),
        }),
      };
    }
  }

  const api: DataGridExcelJsApi = { Workbook: FakeWorkbook };
  return { api, written, sheets };
}

async function readWorkbook(blob: Blob) {
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('The file did not read as bytes'));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

describe('excelFormatter', () => {
  it('writes the headers, then a row per item, into a sheet of the given name', async () => {
    const { api, written, sheets } = createFakeExcelJs();

    await excelFormatter(params({ loadExcelJs: () => Promise.resolve(api), sheetName: 'People' }));

    expect(sheets).toEqual(['People']);
    expect(written.get('1:1')).toBe('Name');
    expect(written.get('1:3')).toBe('Joined');
    expect(written.get('2:1')).toBe('Alice');
    // A number stays a number and a date a date, as processExcelValue decides.
    expect(written.get('2:2')).toBe(12.5);
    expect(written.get('2:3')).toEqual(new Date('2024-01-15'));
    expect(written.get('3:2')).toBe('007');
  });

  it('starts at the first row when the headers are left out', async () => {
    const { api, written } = createFakeExcelJs();

    await excelFormatter(params({ loadExcelJs: () => Promise.resolve(api), includeHeaders: false }));

    expect(written.get('1:1')).toBe('Alice');
  });

  it('writes what a transformer returns, with the row and the grid context', async () => {
    const { api, written } = createFakeExcelJs();

    await excelFormatter(
      params({
        loadExcelJs: () => Promise.resolve(api),
        transformCellText: { name: ({ formattedValue, row }) => `${formattedValue} #${row.id}` },
      }),
    );

    expect(written.get('2:1')).toBe('Alice #1');
  });

  it('accepts the package under `default`, the way a CommonJS package arrives under some bundlers', async () => {
    const { api, written } = createFakeExcelJs();
    const wrapped: DataGridExcelJsModule = { default: api };

    await excelFormatter(params({ loadExcelJs: () => Promise.resolve(wrapped) }));

    expect(written.get('1:1')).toBe('Name');
  });

  it('refuses, saying what is missing, when there is no loader', async () => {
    await expect(excelFormatter(params({}))).rejects.toThrow(/Exporting to Excel needs `loadExcelJs`/);
  });

  it('refuses a loader that does not resolve to exceljs', async () => {
    // What a loader resolves to is only a type, so a wrong module gets to the formatter.
    const notExcelJs = Object.assign(Object.create(null), { Workbook: 'not a class' });

    await expect(
      excelFormatter(params({ loadExcelJs: () => Promise.resolve(notExcelJs) })),
    ).rejects.toThrow(/exceljs/);
  });

  it('writes a workbook that exceljs itself reads back, with its types', async () => {
    const blob = await excelFormatter(
      params({ loadExcelJs: () => Promise.resolve(ExcelJS), sheetName: 'People' }),
    );

    if (!(blob instanceof Blob)) throw new Error('The Excel formatter has to produce a file');
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const workbook = await readWorkbook(blob);
    const sheet = workbook.getWorksheet('People');
    expect(sheet?.getRow(1).getCell(1).value).toBe('Name');
    expect(sheet?.getRow(2).getCell(1).value).toBe('Alice');
    expect(sheet?.getRow(2).getCell(2).value).toBe(12.5);
    expect(sheet?.getRow(2).getCell(3).value).toEqual(new Date('2024-01-15'));
    expect(sheet?.getRow(3).getCell(2).value).toBe('007');
  });

  it('is handed the loader\'s package once per export', async () => {
    const { api } = createFakeExcelJs();
    const loadExcelJs = vi.fn(() => Promise.resolve(api));

    await excelFormatter(params({ loadExcelJs }));

    expect(loadExcelJs).toHaveBeenCalledOnce();
  });
});
