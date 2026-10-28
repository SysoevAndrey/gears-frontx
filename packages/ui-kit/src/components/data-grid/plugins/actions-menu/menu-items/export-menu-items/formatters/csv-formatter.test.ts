import { beforeAll, describe, expect, it } from 'vitest';
import { createGridPluginContext } from '../../../../../../../__test-utils__/grid-plugin-context';
import type { DataGridPluginContext } from '../../../../../services/plugins/plugins-types';
import type { DataGridExportFormatterParams } from '../export-types';
import { csvFormatter } from './csv-formatter';

interface Row {
  id: string;
  name: string;
  value: string;
}

let gridContext: DataGridPluginContext<Row>;

beforeAll(async () => {
  gridContext = await createGridPluginContext<Row>([{ id: '0', name: 'Placeholder', value: '0' }]);
});

function createContext(
  overrides: Partial<DataGridExportFormatterParams<Row>> = {},
): DataGridExportFormatterParams<Row> {
  return {
    data: [
      { id: '1', name: 'Alice', value: '100' },
      { id: '2', name: 'Bob', value: '200' },
    ],
    columns: [
      { id: 'name', label: 'Name' },
      { id: 'value', label: 'Value' },
    ],
    options: {},
    gridContext,
    ...overrides,
  };
}

async function lines(context: DataGridExportFormatterParams<Row>) {
  const result = await csvFormatter(context);
  if (typeof result !== 'string') throw new Error('The CSV formatter has to produce text');
  return result.split('\n');
}

describe('csvFormatter', () => {
  it('generates CSV with headers by default', async () => {
    const result = await lines(createContext());

    expect(result[0]).toBe('Name,Value');
    expect(result[1]).toBe('Alice,100');
    expect(result[2]).toBe('Bob,200');
  });

  it('excludes headers when includeHeaders is false', async () => {
    const result = await lines(createContext({ options: { includeHeaders: false } }));

    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Alice,100');
  });

  it('uses custom delimiter', async () => {
    const result = await lines(createContext({ options: { delimiter: ';' } }));

    expect(result[0]).toBe('Name;Value');
    expect(result[1]).toBe('Alice;100');
  });

  it('escapes values containing delimiter', async () => {
    const result = await lines(
      createContext({ data: [{ id: '1', name: 'Last, First', value: '100' }] }),
    );

    expect(result[1]).toBe('"Last, First",100');
  });

  it('escapes values containing quotes', async () => {
    const result = await lines(
      createContext({ data: [{ id: '1', name: 'Say "hello"', value: '100' }] }),
    );

    expect(result[1]).toBe('"Say ""hello""",100');
  });

  it('escapes values containing newlines', async () => {
    const result = await lines(
      createContext({ data: [{ id: '1', name: 'Line1\nLine2', value: '100' }] }),
    );

    expect(result[1]).toBe('"Line1');
    expect(result[2]).toBe('Line2",100');
  });

  it('uses column formatter when provided', async () => {
    const result = await lines(
      createContext({
        columns: [
          { id: 'name', label: 'Name' },
          { id: 'value', label: 'Value', formatter: (v) => `$${v}` },
        ],
      }),
    );

    expect(result[1]).toBe('Alice,$100');
  });

  it.each([
    { character: 'equals sign', malicious: '=SUM(A1)' },
    { character: 'plus sign', malicious: '+cmd' },
    { character: 'minus sign', malicious: '-cmd' },
    { character: 'at sign', malicious: '@import' },
    { character: 'tab', malicious: '\tcmd' },
    { character: 'carriage return', malicious: '\rcmd' },
  ])('escapes CSV injection value starting with $character', async ({ malicious }) => {
    const result = await lines(
      createContext({ data: [{ id: '1', name: malicious, value: '100' }] }),
    );

    const nameCell = result[1].split(',')[0];
    // Value must be quoted and prefixed with a tab to neutralize the formula character
    expect(nameCell).toBe(`"\t${malicious.replace(/"/g, '""')}"`);
  });

  it('puts a header that starts with a formula character in quotes too', async () => {
    const result = await lines(createContext({ columns: [{ id: 'name', label: '=Name' }] }));

    expect(result[0]).toBe('"\t=Name"');
  });

  it('applies the transformer of a column to its cells, with the row and the grid context', async () => {
    const received: unknown[] = [];
    const result = await lines(
      createContext({
        options: {
          transformCellText: {
            name: (cell, context) => {
              received.push(cell.row, context);
              return cell.formattedValue.toUpperCase();
            },
          },
        },
      }),
    );

    expect(result[1]).toBe('ALICE,100');
    expect(received[0]).toEqual({ id: '1', name: 'Alice', value: '100' });
    expect(received[1]).toBe(gridContext);
  });
});
