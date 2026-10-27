import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '../../../../__test-utils__/render-with-user';
import tableStyles from '../../../table/table.module.css';
import configStyles from './components/data-grid-table-configuration.module.css';
import { DataGrid } from '../../data-grid';
import type { DataGridLoadResult } from '../../data-grid-types';
import { messages } from '../../messages';
import type { DataGridTableColumn, DataGridTableGroup } from '../../services/table/table-types';
import { DataGridTableConfigurationPlugin } from './table-configuration-plugin';

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(function () {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  }),
);

interface Item {
  id: number;
  name: string;
  email: string;
  role: string;
}

const data: Item[] = [{ id: 1, name: 'Ada', email: 'ada@example.com', role: 'Admin' }];

function load(): Promise<DataGridLoadResult<Item>> {
  return Promise.resolve({ results: data, total: data.length });
}

const columns: DataGridTableColumn<Item>[] = [
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Role', visibleToggleDisabled: true },
];

const groupedColumns: (DataGridTableColumn<Item> | DataGridTableGroup<Item>)[] = [
  { id: 'name', label: 'Name' },
  {
    id: 'contact',
    label: 'Contact',
    columns: [
      { id: 'email', label: 'Email' },
      { id: 'role', label: 'Role' },
    ],
  },
];

function renderGrid(
  name: string,
  gridColumns: (DataGridTableColumn<Item> | DataGridTableGroup<Item>)[] = columns,
  persistentColumnVisibility = false,
) {
  return render(
    <DataGrid
      name={name}
      persistent="memory"
      persistentColumnVisibility={persistentColumnVisibility}
      load={load}
      columns={gridColumns}
    >
      <DataGridTableConfigurationPlugin />
    </DataGrid>,
  );
}

async function openPanel(user: ReturnType<typeof render>['user']) {
  await user.click(
    await screen.findByRole('button', { name: messages.tableConfiguration.configureColumns }),
  );
  // The panel renders in a portal, so it is queried from the document.
  return screen.findByText(messages.tableConfiguration.header);
}

const header = (name: string) => screen.queryByRole('columnheader', { name });

beforeEach(() => {
  localStorage.clear();
});

describe('DataGridTableConfigurationPlugin', () => {
  it('opens a panel from the Configure columns button, with a switch for every column', async () => {
    const { user } = renderGrid('table_config_open');
    await screen.findByText('Ada');

    expect(screen.queryByText(messages.tableConfiguration.header)).not.toBeInTheDocument();
    await openPanel(user);

    expect(screen.getAllByRole('switch')).toHaveLength(3);
    for (const label of ['Name', 'Email', 'Role']) {
      expect(screen.getByRole('menuitem', { name: new RegExp(label) })).toBeInTheDocument();
    }

    await user.keyboard('{Escape}');
    expect(screen.queryByText(messages.tableConfiguration.header)).not.toBeInTheDocument();
  });

  it('hides a column from the table when its switch is turned off, and shows it again', async () => {
    const { user } = renderGrid('table_config_visibility');
    await screen.findByText('Ada');
    await openPanel(user);
    const emailSwitch = screen.getAllByRole('switch')[1];

    await user.click(emailSwitch);
    expect(header('Email')).not.toBeInTheDocument();
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
    expect(emailSwitch).not.toBeChecked();

    await user.click(emailSwitch);
    expect(header('Email')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('toggles a switch once from the keyboard, though it sits inside a menu item', async () => {
    const { user } = renderGrid('table_config_keyboard');
    await screen.findByText('Ada');
    await openPanel(user);
    const emailSwitch = screen.getAllByRole('switch')[1];

    emailSwitch.focus();
    await user.keyboard(' ');

    expect(emailSwitch).not.toBeChecked();
    expect(header('Email')).not.toBeInTheDocument();
  });

  it('locks the switch of the last visible column', async () => {
    const { user } = renderGrid('table_config_last', [
      { id: 'name', label: 'Name' },
      { id: 'email', label: 'Email' },
    ]);
    await screen.findByText('Ada');
    await openPanel(user);
    const [nameSwitch, emailSwitch] = screen.getAllByRole('switch');
    expect(nameSwitch).not.toHaveAttribute('aria-disabled', 'true');

    await user.click(emailSwitch);

    expect(nameSwitch).toHaveAttribute('aria-disabled', 'true');
    expect(nameSwitch).toBeChecked();
    expect(header('Name')).toBeInTheDocument();

    // The hidden column is not the last visible one: its switch stays free, or it could never be
    // shown again.
    expect(emailSwitch).not.toHaveAttribute('aria-disabled', 'true');
    await user.click(emailSwitch);
    expect(header('Email')).toBeInTheDocument();
    expect(nameSwitch).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps a column whose visibleToggleDisabled is set locked, whatever else is visible', async () => {
    const { user } = renderGrid('table_config_disabled');
    await screen.findByText('Ada');
    await openPanel(user);

    expect(screen.getAllByRole('switch')[2]).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByRole('switch')[0]).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('pins and unpins a column from the row, and the label follows', async () => {
    const { user } = renderGrid('table_config_pin');
    await screen.findByText('Ada');
    await openPanel(user);

    expect(screen.getAllByRole('button', { name: messages.tableConfiguration.pinColumn })).toHaveLength(3);
    expect(header('Name')?.className).not.toContain(tableStyles.pinned);

    const [pinName, pinEmail] = screen.getAllByRole('button', {
      name: messages.tableConfiguration.pinColumn,
    });
    // Only on hover or focus, for a column that is not pinned.
    expect(pinName.parentElement).not.toHaveClass(configStyles.pinButtonVisible);

    await user.click(pinName);

    const unpin = screen.getByRole('button', { name: messages.tableConfiguration.unpinColumn });
    expect(unpin).toHaveAttribute('aria-pressed', 'true');
    // Always, for one that is: a pinned column's pin is its state, not a hover affordance.
    expect(unpin.parentElement).toHaveClass(configStyles.pinButtonVisible);
    expect(pinEmail.parentElement).not.toHaveClass(configStyles.pinButtonVisible);
    expect(header('Name')?.className).toContain(tableStyles.pinned);
    expect(header('Email')?.className).not.toContain(tableStyles.pinned);

    await user.click(unpin);
    expect(header('Name')?.className).not.toContain(tableStyles.pinned);
  });

  it('shows a group as a section: a pin for the group, and a switch but no pin for each column in it', async () => {
    const { user } = renderGrid('table_config_group', groupedColumns);
    await screen.findByText('Ada');
    await openPanel(user);

    const groupRow = screen.getByRole('menuitem', { name: /Contact/ });
    expect(within(groupRow).getByRole('button', { name: messages.tableConfiguration.pinColumn })).toBeInTheDocument();
    expect(within(groupRow).queryByRole('switch')).not.toBeInTheDocument();

    for (const label of ['Email', 'Role']) {
      const row = screen.getByRole('menuitem', { name: new RegExp(label) });
      expect(within(row).getByRole('switch')).toBeInTheDocument();
      expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    }
    // Name, the group, and its two columns.
    expect(screen.getAllByRole('switch')).toHaveLength(3);

    expect(header('Contact')?.className).not.toContain(tableStyles.pinned);

    await user.click(within(groupRow).getByRole('button', { name: messages.tableConfiguration.pinColumn }));
    expect(within(groupRow).getByRole('button', { name: messages.tableConfiguration.unpinColumn })).toBeInTheDocument();

    // The heading and every column under it pin together; nothing else does.
    for (const name of ['Contact', 'Email', 'Role']) {
      expect(header(name)?.className, name).toContain(tableStyles.pinned);
    }
    expect(header('Name')?.className).not.toContain(tableStyles.pinned);

    await user.click(within(groupRow).getByRole('button', { name: messages.tableConfiguration.unpinColumn }));
    for (const name of ['Contact', 'Email', 'Role']) {
      expect(header(name)?.className, name).not.toContain(tableStyles.pinned);
    }
  });

  it('remembers a hidden column across a remount when the grid opts in to persistent visibility', async () => {
    const first = renderGrid('table_config_persist', columns, true);
    await screen.findByText('Ada');
    await openPanel(first.user);
    await first.user.click(screen.getAllByRole('switch')[1]);
    await first.user.keyboard('{Escape}');
    expect(header('Email')).not.toBeInTheDocument();
    first.unmount();

    renderGrid('table_config_persist', columns, true);

    await screen.findByRole('columnheader', { name: 'Name' });
    expect(header('Email')).not.toBeInTheDocument();
  });
});
