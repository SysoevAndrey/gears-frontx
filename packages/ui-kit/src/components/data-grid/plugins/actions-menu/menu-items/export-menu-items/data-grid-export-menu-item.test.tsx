import { screen, waitFor } from '@testing-library/react';
import * as ExcelJS from 'exceljs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '../../../../../../__test-utils__/render-with-user';
import { DataGrid } from '../../../../data-grid';
import type { DataGridLoadContext, DataGridLoadResult } from '../../../../data-grid-types';
import { messages } from '../../../../messages';
import type { DataGridTableColumn } from '../../../../services/table/table-types';
import { DataGridPaginationPlugin } from '../../../pagination/pagination-plugin';
import { DataGridTableTreePlugin } from '../../../table-tree/table-tree-plugin';
import { DataGridActionsMenuPlugin } from '../../actions-menu-plugin';
import { exportMenuItems } from './export-menu-items';
import type { DataGridExportOptions } from './export-types';

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(function () {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }),
);

interface Person {
  id: number;
  name: string;
  age: number;
  parent_id: number | null;
  has_children: boolean;
}

const people: Person[] = [
  { id: 1, name: 'Alice', age: 30, parent_id: null, has_children: true },
  { id: 2, name: 'Bob', age: 41, parent_id: null, has_children: false },
  { id: 3, name: 'Carol', age: 7, parent_id: 1, has_children: false },
  { id: 4, name: 'Dave', age: 9, parent_id: 1, has_children: false },
  { id: 5, name: 'Erin', age: 52, parent_id: null, has_children: false },
];
const roots = people.filter((person) => person.parent_id === null);

const columns: DataGridTableColumn<Person>[] = [
  { id: 'name', label: 'Name' },
  { id: 'age', label: 'Age', formatter: (age) => `${age} y` },
];

function load(): Promise<DataGridLoadResult<Person>> {
  return Promise.resolve({ results: roots, total: roots.length });
}

// A download is an anchor that is clicked: the file it is given and the name it is saved as.
interface Download {
  name: string;
  blob: Blob;
}

let downloads: Download[];
const blobsByUrl = new Map<string, Blob>();

beforeEach(() => {
  downloads = [];
  blobsByUrl.clear();
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    const url = `blob:test-${blobsByUrl.size}`;
    if (blob instanceof Blob) blobsByUrl.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(
    this: HTMLAnchorElement,
  ) {
    const blob = blobsByUrl.get(this.href);
    if (blob) downloads.push({ name: this.download, blob });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function csvLines(download: Download) {
  return (await readText(download.blob)).split('\n');
}

function renderGrid(
  name: string,
  config: Partial<DataGridExportOptions<Person>> | undefined,
  options: { columns?: DataGridTableColumn<Person>[]; plugins?: React.ReactNode; rows?: (context: DataGridLoadContext) => Promise<DataGridLoadResult<Person>> } = {},
) {
  const menuItems = exportMenuItems<Person>(config);
  return render(
    <DataGrid<Person>
      name={name}
      persistent="memory"
      load={options.rows ?? load}
      columns={options.columns ?? columns}
    >
      <DataGridActionsMenuPlugin menuItems={menuItems} />
      {options.plugins}
    </DataGrid>,
  );
}

async function openMenu(user: ReturnType<typeof render>['user']) {
  await user.click(await screen.findByRole('button', { name: messages.actionsMenu.actions }));
  return screen.findByRole('menu');
}

async function choose(user: ReturnType<typeof render>['user'], label: string) {
  await openMenu(user);
  await user.click(await screen.findByRole('menuitem', { name: label }));
}

const exportAsCsv = messages.exportMenuItem.exportAs('CSV');
const exportAsExcel = messages.exportMenuItem.exportAs('Excel');

describe('the export menu items', () => {
  it('lists only CSV when the grid is given no way to load exceljs', async () => {
    const { user } = renderGrid('export_menu_csv_only', undefined);
    const menu = await openMenu(user);

    const labels = Array.from(menu.querySelectorAll('[role="menuitem"]')).map((item) => item.textContent);
    expect(labels).toEqual([exportAsCsv]);
  });

  it('lists Excel before CSV when it is', async () => {
    const { user } = renderGrid('export_menu_both', { loadExcelJs: () => Promise.resolve(ExcelJS) });
    const menu = await openMenu(user);

    const labels = Array.from(menu.querySelectorAll('[role="menuitem"]')).map((item) => item.textContent);
    expect(labels).toEqual([exportAsExcel, exportAsCsv]);
  });

  it('downloads a CSV of the visible columns, with their labels and formatters, under the default name', async () => {
    const { user } = renderGrid('export_menu_download', undefined, {
      columns: [...columns, { id: 'hidden', label: 'Hidden', visible: false }],
    });
    await screen.findByText('Alice');

    await choose(user, exportAsCsv);

    await waitFor(() => expect(downloads).toHaveLength(1));
    // Choosing an item closes the menu, so the export has nowhere of its own to show a failure.
    expect(screen.queryByRole('menu')).toBeNull();
    expect(downloads[0].name).toBe(`${messages.exportMenuItem.defaultFilename}.csv`);
    expect(downloads[0].blob.type).toBe('text/csv');
    expect(await csvLines(downloads[0])).toEqual(['Name,Age', 'Alice,30 y', 'Bob,41 y', 'Erin,52 y']);
  });

  it('takes the filename, delimiter, headers and transformers from the config', async () => {
    const { user } = renderGrid('export_menu_config', {
      filename: () => 'people.csv',
      delimiter: ';',
      includeHeaders: false,
      transformCellText: { name: ({ formattedValue, row }) => `${formattedValue}#${row.id}` },
    });
    await screen.findByText('Alice');

    await choose(user, exportAsCsv);

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].name).toBe('people.csv');
    expect(await csvLines(downloads[0])).toEqual(['Alice#1;30 y', 'Bob#2;41 y', 'Erin#5;52 y']);
  });

  it('exports every page and not only the one on screen', async () => {
    function loadPage(context: DataGridLoadContext): Promise<DataGridLoadResult<Person>> {
      const page = context.pagination?.page ?? 1;
      const limit = context.pagination?.limit ?? roots.length;
      return Promise.resolve({ results: roots.slice((page - 1) * limit, page * limit), total: roots.length });
    }
    const { user } = renderGrid('export_menu_pages', undefined, {
      rows: loadPage,
      plugins: <DataGridPaginationPlugin defaultLimit={2} limits={[2]} />,
    });
    await screen.findByText('Alice');

    await choose(user, exportAsCsv);

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect((await csvLines(downloads[0])).map((line) => line.split(',')[0])).toEqual([
      'Name',
      'Alice',
      'Bob',
      'Erin',
    ]);
  });

  it('exports a tree grid with the rows under its closed rows', async () => {
    const { user } = renderGrid(
      'export_menu_tree',
      undefined,
      {
        rows: () => Promise.resolve({ results: people, total: people.length }),
        plugins: <DataGridTableTreePlugin<Person> parentKey="parent_id" />,
      },
    );
    await screen.findByText('Alice');
    expect(screen.queryByText('Carol')).toBeNull();

    await choose(user, exportAsCsv);

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect((await csvLines(downloads[0])).map((line) => line.split(',')[0])).toEqual([
      'Name',
      'Alice',
      'Carol',
      'Dave',
      'Bob',
      'Erin',
    ]);
  });

  it('downloads an Excel file that exceljs reads back, under the default name and sheet', async () => {
    const { user } = renderGrid('export_menu_excel', { loadExcelJs: () => Promise.resolve(ExcelJS) });
    await screen.findByText('Alice');

    await choose(user, exportAsExcel);

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].name).toBe(`${messages.exportMenuItem.defaultFilename}.xlsx`);
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) resolve(reader.result);
        else reject(new Error('The file did not read as bytes'));
      };
      reader.readAsArrayBuffer(downloads[0].blob);
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet(messages.exportMenuItem.defaultSheetName);
    expect(sheet?.getRow(1).values).toEqual([undefined, 'Name', 'Age']);
    // The column's formatter changed the text, so the cell holds the text and not the number.
    expect(sheet?.getRow(2).values).toEqual([undefined, 'Alice', '30 y']);
  });

  it('keeps the sheet name and the filename a config gives', async () => {
    const { user } = renderGrid('export_menu_excel_config', {
      loadExcelJs: () => Promise.resolve(ExcelJS),
      filename: 'People',
      sheetName: 'Staff',
    });
    await screen.findByText('Alice');

    await choose(user, exportAsExcel);

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].name).toBe('People.xlsx');
  });

  it('reports a failure to onError and downloads nothing', async () => {
    const onError = vi.fn();
    const { user } = renderGrid('export_menu_error', {
      onError,
      transformCellText: {
        name: () => {
          throw new Error('Cannot print this name');
        },
      },
    });
    await screen.findByText('Alice');

    await choose(user, exportAsCsv);

    await waitFor(() => expect(onError).toHaveBeenCalledWith(new Error('Cannot print this name')));
    expect(downloads).toHaveLength(0);
  });

  it('logs a failure to the console when there is no onError, and downloads nothing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { user } = renderGrid('export_menu_console', {
      transformCellText: {
        name: () => {
          throw new Error('Cannot print this name');
        },
      },
    });
    await screen.findByText('Alice');

    await choose(user, exportAsCsv);

    await waitFor(() => expect(error).toHaveBeenCalledWith('Export failed:', new Error('Cannot print this name')));
    expect(downloads).toHaveLength(0);
  });
});
