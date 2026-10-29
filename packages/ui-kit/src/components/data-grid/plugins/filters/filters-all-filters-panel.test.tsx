import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { lastFilters, renderFiltersGrid } from '../../../../__test-utils__/filters-grid';
import { messages } from '../../messages';
import { filterCheckboxGroup } from './entities/checkbox-group/filter-checkbox-group';
import { filterSearch } from './entities/search/filter-search';
import { filterTagGroup } from './entities/tag-group/filter-tag-group';
import { filterToggle } from './entities/toggle/filter-toggle';

const statusOptions = [
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

const tagOptions = [
  { label: 'Red', value: 'red' },
  { label: 'Green', value: 'green' },
];

function entities() {
  return [
    filterToggle({ id: 'flag', label: 'Flag' }),
    filterSearch({ id: 'query', label: 'Query' }),
    filterCheckboxGroup({ id: 'status', label: 'Status', options: statusOptions }),
    filterTagGroup({ id: 'tags', label: 'Tags', options: tagOptions }),
  ];
}

async function openPanel(user: Awaited<ReturnType<typeof renderFiltersGrid>>['user']) {
  await user.click(
    screen.getByRole('button', { name: new RegExp(`^${messages.filters.allFilters}`) }),
  );
  return screen.findByRole('dialog');
}

function section(dialog: HTMLElement, name: string) {
  return within(dialog).getByRole('button', { name: new RegExp(`^${name}`) });
}

beforeEach(() => {
  localStorage.clear();
});

describe('the All filters panel', () => {
  it('has a titled section for each filter that has one, and an Apply button', async () => {
    const { user } = await renderFiltersGrid({ entities: entities() });

    const dialog = await openPanel(user);

    expect(within(dialog).getByText(messages.filters.allFiltersTitle)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Status' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Tags' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Flag' })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Query' })).toBeNull();
    expect(
      within(dialog).getByRole('button', { name: messages.filters.apply }),
    ).toBeInTheDocument();
  });

  it("opens in the grid's portalContainer", async () => {
    const container = document.body.appendChild(document.createElement('div'));
    const { user } = await renderFiltersGrid({ entities: entities(), portalContainer: container });

    expect(container).toContainElement(await openPanel(user));
    container.remove();
  });

  it('keeps the choices in a draft until Apply, which loads them and closes the panel', async () => {
    const { user, load } = await renderFiltersGrid({ entities: entities() });
    const dialog = await openPanel(user);
    const loads = load.mock.calls.length;

    await user.click(section(dialog, 'Status'));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Published' }));
    await user.click(section(dialog, 'Tags'));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Green' }));

    expect(load).toHaveBeenCalledTimes(loads);

    await user.click(within(dialog).getByRole('button', { name: messages.filters.apply }));

    await waitFor(() =>
      expect(lastFilters(load)).toEqual({
        status: { value: ['published'] },
        tags: { value: ['green'] },
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: /^All filters/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /^Status/ })).toHaveTextContent('1');
  });

  it('counts the filters its own sections hold in the All filters chip, and not the others', async () => {
    const { user } = await renderFiltersGrid({ entities: entities() });

    await user.click(screen.getByRole('button', { name: 'Flag' }));
    await user.click(screen.getByRole('button', { name: /^Status/ }));
    await user.click(await screen.findByRole('checkbox', { name: 'Draft' }));
    await user.click(screen.getByRole('checkbox', { name: 'Archived' }));

    // Two filters are applied, but the toggle has no section: one filter, however many choices.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^All filters/ })).toHaveTextContent('1'),
    );
    expect(screen.getByRole('button', { name: /^Status/ })).toHaveTextContent('2');
  });

  it('throws the draft away when the panel is left, and starts the next one from what is applied', async () => {
    const { user, load } = await renderFiltersGrid({ entities: entities() });
    let dialog = await openPanel(user);
    await user.click(section(dialog, 'Status'));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Published' }));
    const loads = load.mock.calls.length;

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(load).toHaveBeenCalledTimes(loads);

    dialog = await openPanel(user);
    await user.click(section(dialog, 'Status'));
    expect(within(dialog).getByRole('checkbox', { name: 'Published' })).not.toBeChecked();
  });

  it('has a close button that leaves the panel and throws the draft away, as Escape does', async () => {
    const { user, load } = await renderFiltersGrid({ entities: entities() });
    let dialog = await openPanel(user);
    await user.click(section(dialog, 'Status'));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Published' }));
    const loads = load.mock.calls.length;

    await user.click(within(dialog).getByRole('button', { name: messages.filters.closeDialog }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(load).toHaveBeenCalledTimes(loads);
    dialog = await openPanel(user);
    await user.click(section(dialog, 'Status'));
    expect(within(dialog).getByRole('checkbox', { name: 'Published' })).not.toBeChecked();
  });

  it('opens on the choices made through the chips', async () => {
    const { user } = await renderFiltersGrid({ entities: entities() });
    await user.click(screen.getByRole('button', { name: /^Status/ }));
    await user.click(await screen.findByRole('checkbox', { name: 'Draft' }));
    await user.keyboard('{Escape}');

    const dialog = await openPanel(user);
    await user.click(section(dialog, 'Status'));

    expect(within(dialog).getByRole('checkbox', { name: 'Draft' })).toBeChecked();
    // The count tag of the section, which has its own button to clear it.
    expect(
      within(dialog).getByRole('button', { name: messages.filters.close }),
    ).toBeInTheDocument();
  });

  it('applies a section the draft cleared as no filter at all', async () => {
    const { user, load } = await renderFiltersGrid({ entities: entities() });
    await user.click(screen.getByRole('button', { name: /^Status/ }));
    await user.click(await screen.findByRole('checkbox', { name: 'Draft' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(lastFilters(load)).toEqual({ status: { value: ['draft'] } }));

    const dialog = await openPanel(user);
    await user.click(within(dialog).getByRole('button', { name: messages.filters.close }));
    await user.click(within(dialog).getByRole('button', { name: messages.filters.apply }));

    await waitFor(() => expect(lastFilters(load)).toBeUndefined());
    expect(screen.getByRole('button', { name: /^Status/ })).not.toHaveTextContent('1');
  });

  describe('by the width of the window', () => {
    const original = window.innerWidth;
    function resizeTo(width: number) {
      window.innerWidth = width;
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }

    afterEach(() => {
      resizeTo(original);
    });

    it('slides in from the side on a tablet or wider, and up from the bottom on a phone', async () => {
      const wide = await renderFiltersGrid({ entities: entities() });
      expect(await openPanel(wide.user)).toHaveAttribute('data-side', 'right');
      wide.unmount();

      resizeTo(500);
      const narrow = await renderFiltersGrid({ entities: entities() });
      expect(await openPanel(narrow.user)).toHaveAttribute('data-side', 'bottom');
    });

    it('opens a chip beside it on a tablet or wider, and as a panel from the bottom on a phone', async () => {
      const wide = await renderFiltersGrid({ entities: entities() });
      await wide.user.click(screen.getByRole('button', { name: /^Status/ }));
      const popover = await screen.findByRole('dialog');
      expect(popover.hasAttribute('data-swipe-axis')).toBe(false);
      wide.unmount();

      resizeTo(500);
      const narrow = await renderFiltersGrid({ entities: entities() });
      await narrow.user.click(screen.getByRole('button', { name: /^Status/ }));
      const panel = await screen.findByRole('dialog');
      expect(panel.hasAttribute('data-swipe-axis')).toBe(true);
      expect(within(panel).getByRole('checkbox', { name: 'Published' })).toBeInTheDocument();
    });

    it("opens a chip's popover in the grid's portalContainer", async () => {
      const container = document.body.appendChild(document.createElement('div'));
      const { user } = await renderFiltersGrid({ entities: entities(), portalContainer: container });

      await user.click(screen.getByRole('button', { name: /^Status/ }));

      expect(container).toContainElement(await screen.findByRole('dialog'));
      container.remove();
    });

    it("opens a chip's panel on a phone in the grid's portalContainer", async () => {
      const container = document.body.appendChild(document.createElement('div'));
      resizeTo(500);
      const { user } = await renderFiltersGrid({ entities: entities(), portalContainer: container });

      await user.click(screen.getByRole('button', { name: /^Status/ }));

      const panel = await screen.findByRole('dialog');
      expect(panel.hasAttribute('data-swipe-axis')).toBe(true);
      expect(container).toContainElement(panel);
      container.remove();
    });

    it('follows the window when it is resized with a chip closed', async () => {
      const { user } = await renderFiltersGrid({ entities: entities() });
      resizeTo(500);

      await user.click(screen.getByRole('button', { name: /^Status/ }));

      expect((await screen.findByRole('dialog')).hasAttribute('data-swipe-axis')).toBe(true);
    });
  });
});
