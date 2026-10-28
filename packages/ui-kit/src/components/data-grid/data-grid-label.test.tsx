import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '../../__test-utils__/render-with-user';
import { DataGrid } from './data-grid';
import type { DataGridLoadContext, DataGridLoadResult, LoadFunction } from './data-grid-types';
import { messages } from './messages';
import { DataGridPaginationPlugin } from './plugins/pagination/pagination-plugin';
import type { DataGridTableColumn } from './services/table/table-types';

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(function () {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }),
);

interface Item {
  id: number;
  name: string;
}

const columns: DataGridTableColumn<Item>[] = [{ id: 'name', label: 'Name' }];

const TOTAL = 55;

// One stable load for every grid below: a new function identity each render would read as a
// change and reload the grids mid-assertion.
const load: LoadFunction<Item> = ({ pagination }: DataGridLoadContext) => {
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? 12;
  const start = (page - 1) * limit;
  const results = Array.from({ length: Math.max(0, Math.min(limit, TOTAL - start)) }, (_, i) => ({
    id: start + i + 1,
    name: `Item ${start + i + 1}`,
  }));
  return Promise.resolve<DataGridLoadResult<Item>>({ results, total: TOTAL });
};

function Grid({ name, label }: { name: string; label?: string }) {
  return (
    <DataGrid name={name} label={label} load={load} columns={columns}>
      <DataGridPaginationPlugin />
    </DataGrid>
  );
}

describe('DataGrid label', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('names the pager and the table of two labelled grids apart', async () => {
    render(
      <>
        <Grid name="label_users" label="Users" />
        <Grid name="label_teams" label="Teams" />
      </>,
    );

    // Each pager is a nav whose name carries its own label; a role query for one name finds
    // exactly one nav, which is what keeps the two landmarks from sharing a name (axe's
    // landmark-unique).
    expect(
      await screen.findByRole('navigation', { name: messages.pagination.ariaLabelFor('Users') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: messages.pagination.ariaLabelFor('Teams') }),
    ).toBeInTheDocument();

    // The table's scroll wrapper is a region named with the label alone.
    expect(await screen.findByRole('region', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Teams' })).toBeInTheDocument();
  });

  it('keeps the unlabelled names: one nav named "Pagination" and no region', async () => {
    render(<Grid name="label_plain" />);

    expect(
      await screen.findByRole('navigation', { name: messages.pagination.ariaLabel }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    // No label, no named wrapper: the table's scroll container carries no role at all, exactly
    // as before the prop existed.
    expect(document.querySelector('[role="region"]')).toBeNull();
  });

  it('reads a blank label as no label', async () => {
    const { rerender } = render(<Grid name="label_blank" label="" />);

    // A blank string passed through would name the nav " pagination" and leave a region with an
    // empty aria-label behind it; it must read as absent instead.
    expect(
      await screen.findByRole('navigation', { name: messages.pagination.ariaLabel }),
    ).toBeInTheDocument();
    expect(document.querySelector('[role="region"]')).toBeNull();

    rerender(<Grid name="label_blank" label="   " />);
    expect(
      await screen.findByRole('navigation', { name: messages.pagination.ariaLabel }),
    ).toBeInTheDocument();
    expect(document.querySelector('[role="region"]')).toBeNull();

    rerender(<Grid name="label_blank" label="Teams" />);
    expect(
      await screen.findByRole('navigation', { name: messages.pagination.ariaLabelFor('Teams') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Teams' })).toBeInTheDocument();

    // Padding is not part of the name: the attributes carry the trimmed label.
    rerender(<Grid name="label_blank" label="  Teams  " />);
    expect(
      await screen.findByRole('navigation', { name: messages.pagination.ariaLabelFor('Teams') }),
    ).toHaveAttribute('aria-label', messages.pagination.ariaLabelFor('Teams'));
    expect(screen.getByRole('region', { name: 'Teams' })).toHaveAttribute('aria-label', 'Teams');
  });

  it('renames the pager and the table when the label changes after mount', async () => {
    const { rerender } = render(<Grid name="label_rename" label="Users" />);

    expect(
      await screen.findByRole('navigation', { name: messages.pagination.ariaLabelFor('Users') }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Users' })).toBeInTheDocument();

    rerender(<Grid name="label_rename" label="Accounts" />);

    expect(
      screen.getByRole('navigation', { name: messages.pagination.ariaLabelFor('Accounts') }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Accounts' })).toBeInTheDocument();
    // Renamed, not stacked: the old names are gone from both landmarks.
    expect(
      screen.queryByRole('navigation', { name: messages.pagination.ariaLabelFor('Users') }),
    ).toBeNull();
    expect(screen.queryByRole('region', { name: 'Users' })).toBeNull();
  });

  it('returns to the unlabelled names when the label is removed after mount', async () => {
    const { rerender } = render(<Grid name="label_removed" label="Users" />);

    expect(
      await screen.findByRole('navigation', { name: messages.pagination.ariaLabelFor('Users') }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Users' })).toBeInTheDocument();

    rerender(<Grid name="label_removed" />);

    expect(
      await screen.findByRole('navigation', { name: messages.pagination.ariaLabel }),
    ).toBeInTheDocument();
    expect(document.querySelector('[role="region"]')).toBeNull();
  });
});
