import * as ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { DataGridExportMenuItem } from './data-grid-export-menu-item';
import { exportMenuItems } from './export-menu-items';
import type { DataGridExportOptions } from './export-types';

const withExcel: Partial<DataGridExportOptions> = { loadExcelJs: () => Promise.resolve(ExcelJS) };

describe('exportMenuItems', () => {
  it('offers CSV only when there is no way to load exceljs', () => {
    const items = exportMenuItems();

    expect(items).toHaveLength(1);
    expect(items[0].params).toEqual({ type: 'csv', exportConfig: undefined });
  });

  it('offers CSV only for a config that has no loader', () => {
    const items = exportMenuItems({ filename: 'MyReport' });

    expect(items.map((item) => item.params?.type)).toEqual(['csv']);
  });

  it('returns two menu items, Excel first and CSV second, when a loader is given', () => {
    const items = exportMenuItems(withExcel);

    expect(items.map((item) => item.params?.type)).toEqual(['xlsx', 'csv']);
  });

  it('forwards export config to params', () => {
    const items = exportMenuItems({ ...withExcel, filename: 'MyReport', delimiter: ';' });

    const config = { ...withExcel, filename: 'MyReport', delimiter: ';' };
    expect(items[0].params).toEqual({ type: 'xlsx', exportConfig: config });
    expect(items[1].params).toEqual({ type: 'csv', exportConfig: config });
  });

  it('uses DataGridExportMenuItem as component', () => {
    const items = exportMenuItems(withExcel);

    items.forEach((item) => {
      expect(item.component).toBe(DataGridExportMenuItem);
    });
  });

  it('accepts the loader a consumer writes, `() => import("exceljs")`, whose result is the package', () => {
    // Held by the compiler rather than at run time: the whole of exceljs's `Workbook` is assignable
    // to the few members the export declares of it.
    const loadExcelJs: NonNullable<DataGridExportOptions['loadExcelJs']> = () =>
      Promise.resolve(ExcelJS);

    expect(exportMenuItems({ loadExcelJs })).toHaveLength(2);
  });
});
