import { beforeAll, describe, expect, it } from 'vitest';
import { createGridPluginContext } from '../../../../../../__test-utils__/grid-plugin-context';
import type { DataGridPluginContext } from '../../../../services/plugins/plugins-types';
import { applyCellTextTransformation, getCellValue } from './export-cells';
import type { DataGridExportColumn } from './export-types';

describe('getCellValue', () => {
  it('gets value by column id', () => {
    const item = { id: '1', name: 'Alice', age: 30 };
    const column: DataGridExportColumn = { id: 'name', label: 'Name' };

    const result = getCellValue(item, column);
    expect(result.raw).toBe('Alice');
    expect(result.formatted).toBe('Alice');
  });

  it('prefers column key over id', () => {
    const item = { id: '1', name: 'Alice', fullName: 'Alice Smith' };
    const column: DataGridExportColumn = { id: 'name', label: 'Name', key: 'fullName' };

    const result = getCellValue(item, column);
    expect(result.raw).toBe('Alice Smith');
  });

  it('uses column formatter when provided', () => {
    const item = { id: '1', price: 42 };
    const column: DataGridExportColumn = {
      id: 'price',
      label: 'Price',
      formatter: (v) => `$${v}`,
    };

    const result = getCellValue(item, column);
    expect(result.raw).toBe(42);
    expect(result.formatted).toBe('$42');
  });

  it('handles null/undefined values', () => {
    const item = { id: '1', name: null };
    const column: DataGridExportColumn = { id: 'name', label: 'Name' };

    const result = getCellValue(item, column);
    expect(result.raw).toBeNull();
    expect(result.formatted).toBe('');
  });
});

interface Named {
  id: string;
  name: string;
}

describe('applyCellTextTransformation', () => {
  let gridContext: DataGridPluginContext<Named>;

  beforeAll(async () => {
    gridContext = await createGridPluginContext<Named>([{ id: '0', name: 'Placeholder' }]);
  });

  it('returns formatted value when no transformer', () => {
    const item = { id: '1', name: 'Alice' };
    const column: DataGridExportColumn = { id: 'name', label: 'Name' };

    const result = applyCellTextTransformation({
      item,
      column,
      cellValue: { raw: 'Alice', formatted: 'Alice' },
      transformCellText: undefined,
      gridContext,
    });
    expect(result).toBe('Alice');
  });

  it('applies transformer when provided for column', () => {
    const item = { id: '1', name: 'Alice' };
    const column: DataGridExportColumn = { id: 'name', label: 'Name' };

    const result = applyCellTextTransformation({
      item,
      column,
      cellValue: { raw: 'Alice', formatted: 'Alice' },
      transformCellText: {
        name: ({ formattedValue, row }) => `${formattedValue} (${row.id})`,
      },
      gridContext,
    });
    expect(result).toBe('Alice (1)');
  });

  it('does not transform columns without a transformer', () => {
    const item = { id: '1', name: 'Alice' };
    const column: DataGridExportColumn = { id: 'name', label: 'Name' };

    const result = applyCellTextTransformation({
      item,
      column,
      cellValue: { raw: 'Alice', formatted: 'Alice' },
      transformCellText: { other: () => 'transformed' },
      gridContext,
    });
    expect(result).toBe('Alice');
  });
});
