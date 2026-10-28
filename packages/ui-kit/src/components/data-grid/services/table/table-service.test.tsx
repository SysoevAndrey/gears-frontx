import { Component, act, forwardRef, lazy, memo } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { renderHook, screen } from '@testing-library/react';
import { render } from '../../../../__test-utils__/render-with-user';
import { createDataGrid } from '../../create-data-grid';
import { DataGrid } from '../../data-grid';
import type { DataGridLoadResult } from '../../data-grid-types';
import { internalContextKey } from '../internal/internal-helpers';
import { createDataGridPlugin } from '../plugins/plugins-helpers';
import type { DataGridPluginContext } from '../plugins/plugins-types';
import { isConfigurationGroup, type DataGridTableColumn, type DataGridTableGroup } from './table-types';

interface TestItem {
  id: number;
  name: string;
}

function createGrid() {
  return createDataGrid<TestItem>({
    name: 'table_service_test',
    load: { current: () => Promise.resolve<DataGridLoadResult<TestItem>>({ results: [], total: 0 }) },
  });
}

describe('tableService -- stickyHeader', () => {

  it('starts with the sticky header off', () => {
    const grid = createGrid();
    const { result } = renderHook(() => grid[internalContextKey].table.useStickyHeader());

    expect(result.current).toBe(false);
  });

  it('follows updateStickyHeader in both directions', () => {
    const grid = createGrid();
    const { result } = renderHook(() => grid[internalContextKey].table.useStickyHeader());

    act(() => grid.updateStickyHeader(true));
    expect(result.current).toBe(true);

    act(() => grid.updateStickyHeader(false));
    expect(result.current).toBe(false);
  });

  it('exposes updateStickyHeader on the public API plugins receive', () => {
    const grid = createGrid();

    expect(typeof grid[internalContextKey].plugins.pluginContext.updateStickyHeader).toBe(
      'function',
    );
  });
});

class ClassRow extends Component<{ record: unknown }> {
  render() {
    return null;
  }
}

function FunctionRow(_props: { record: unknown }) {
  return null;
}

const MemoRow = memo(FunctionRow);
const ForwardRefRow = forwardRef<HTMLTableRowElement, { record: unknown }>(function ForwardRefRow(
  _props,
  _ref,
) {
  return null;
});
const LazyRow = lazy(() => Promise.resolve({ default: FunctionRow }));

class ClassHeaderLabel extends Component<{ column: DataGridTableColumn }> {
  render() {
    return <span>class label: {this.props.column.id}</span>;
  }
}

const ClassLabelPlugin = createDataGridPlugin('classLabel', (context) => {
  context.registerComponent('header-cell-label', ClassHeaderLabel);
  return {};
});

describe('tableService -- registerComponent', () => {
  it('takes every kind of component on the public API, class components included', () => {
    // Compile-time: `type-check:test` fails the build if the public parameter narrows (it once
    // became `ComponentType<never>`, which refuses a class component).
    type Register = DataGridPluginContext<TestItem>['registerComponent'];
    expectTypeOf<Register>().toBeCallableWith('row', ClassRow);
    expectTypeOf<Register>().toBeCallableWith('row', FunctionRow);
    expectTypeOf<Register>().toBeCallableWith('row', MemoRow);
    expectTypeOf<Register>().toBeCallableWith('row', ForwardRefRow);
    expectTypeOf<Register>().toBeCallableWith('row', LazyRow);
  });

  it('renders a class component registered as an override', async () => {
    render(
      <DataGrid
        name="register_class_component"
        load={() => Promise.resolve({ results: [{ id: 1, name: 'A' }], total: 1 })}
        columns={[{ id: 'name', label: 'Name' }]}
        persistent="memory"
      >
        <ClassLabelPlugin />
      </DataGrid>,
    );

    expect(await screen.findByText('class label: name')).toBeInTheDocument();
  });
});

describe('tableService -- pinned columns', () => {
  const columns: (DataGridTableColumn<TestItem> | DataGridTableGroup<TestItem>)[] = [
    { id: 'name', label: 'Name' },
    { id: 'contact', label: 'Contact', columns: [{ id: 'email', label: 'Email' }, { id: 'phone', label: 'Phone' }] },
    { id: 'role', label: 'Role' },
  ];

  // Two columns before the data, as a row number and a checkbox column register them.
  function createPinGrid(gridColumns = columns) {
    const grid = createGrid();
    const { table } = grid[internalContextKey];
    table.registerExtraColumn({ id: 'select', position: 'start', order: 5, width: '40px' });
    table.registerExtraColumn({ id: 'row_number', position: 'start', order: 3, width: '32px' });
    table.registerExtraColumn({ id: 'actions', position: 'end', width: '60px' });
    act(() => grid.updateColumns(gridColumns));
    return grid;
  }

  function offsetsOf(grid: ReturnType<typeof createGrid>, ids: string[]) {
    return renderHook(() => {
      const { table } = grid[internalContextKey];
      return ids.map((id) => table.useColumnStickyOffset(id));
    });
  }

  const ids = ['row_number', 'select', 'name', 'email', 'actions'];

  it('leaves the extra columns to scroll away while no data column is pinned', () => {
    const grid = createPinGrid();
    const { result } = offsetsOf(grid, ids);

    expect(result.current).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it('pins the extra columns in front of a pinned data column, which sits behind all of them', () => {
    const grid = createPinGrid();
    const { result } = offsetsOf(grid, ids);

    act(() => grid.updateColumnSticky('name', true));

    // Each extra column sits behind the ones before it (by order, not registration), and the pinned
    // data column behind all of them: 32 + 40. An end extra column is not pinned by any of this.
    expect(result.current).toEqual([0, 32, 72, undefined, undefined]);
  });

  it('pins them for a pinned group too, and unpins them with the last pin', () => {
    const grid = createPinGrid();
    const { result } = offsetsOf(grid, ['row_number', 'select', 'email']);

    act(() => grid.updateColumnSticky('contact', true));
    expect(result.current).toEqual([0, 32, 72]);

    act(() => grid.updateColumnSticky('contact', false));
    expect(result.current).toEqual([undefined, undefined, undefined]);
  });

  it('does not pin them for a pinned column the user has hidden', () => {
    const grid = createPinGrid();
    const { result } = offsetsOf(grid, ['row_number', 'select']);
    act(() => grid.updateColumnSticky('name', true));
    expect(result.current).toEqual([0, 32]);

    act(() => grid.updateColumnVisibility('name', false));
    expect(result.current).toEqual([undefined, undefined]);

    act(() => grid.updateColumnVisibility('name', true));
    expect(result.current).toEqual([0, 32]);
  });

  describe('updateColumnSticky on a group', () => {
    function configuration(grid: ReturnType<typeof createGrid>) {
      return renderHook(() => grid[internalContextKey].table.useConfigurationColumns());
    }

    function groupEntry(entries: ReturnType<typeof configuration>['result']) {
      const entry = entries.current.find((candidate) => candidate.id === 'contact');
      if (!entry || !isConfigurationGroup(entry)) throw new Error('no contact group');
      return entry;
    }

    it('pins the heading and every column under it, and unpins them together', () => {
      const grid = createPinGrid();
      const { result } = configuration(grid);

      act(() => grid.updateColumnSticky('contact', true));
      expect(groupEntry(result).sticky).toBe(true);
      expect(groupEntry(result).columns.map((column) => column.sticky)).toEqual([true, true]);
      // Nothing outside the group follows it.
      expect(result.current.find((entry) => entry.id === 'name')?.sticky).toBe(false);

      act(() => grid.updateColumnSticky('contact', false));
      expect(groupEntry(result).sticky).toBe(false);
      expect(groupEntry(result).columns.map((column) => column.sticky)).toEqual([false, false]);
    });

    it('unpins a column that was pinned on its own as well', () => {
      const grid = createPinGrid([
        { id: 'contact', label: 'Contact', columns: [{ id: 'email', label: 'Email', sticky: true }, { id: 'phone', label: 'Phone' }] },
      ]);
      const { result } = configuration(grid);

      act(() => grid.updateColumnSticky('contact', true));
      act(() => grid.updateColumnSticky('contact', false));

      expect(groupEntry(result).columns.map((column) => column.sticky)).toEqual([false, false]);
    });
  });
});
