import { screen, waitFor, within } from '@testing-library/react';
import { format } from 'date-fns';
import { beforeEach, describe, expect, it } from 'vitest';

import { lastFilters, renderFiltersGrid } from '../../../../__test-utils__/filters-grid';
import { filterCheckboxGroup } from './entities/checkbox-group/filter-checkbox-group';
import { filterDateRange } from './entities/date-range/filter-date-range';
import { filterSearch } from './entities/search/filter-search';
import { filterTagGroup } from './entities/tag-group/filter-tag-group';
import { filterToggle } from './entities/toggle/filter-toggle';

// A stored filter is user input: it sits in `localStorage`, or in the address bar, where it can be
// edited, so the plugin has to survive a value of any shape. These write the value a user could
// have left behind and open the filter it belongs to.

const options = [
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
];

function seed(name: string, filters: unknown) {
  localStorage.setItem(
    `dataGrid:${name}:filters`,
    typeof filters === 'string' ? filters : JSON.stringify(filters),
  );
}

function chip(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) });
}

beforeEach(() => {
  localStorage.clear();
});

describe('a list filter whose stored value is not a list', () => {
  // The values are what `includes` does not exist on, and a string, which has one that answers
  // for the wrong thing (a substring) and has no `filter` to remove a choice with.
  const notLists: [string, unknown][] = [
    ['a number', 5],
    ['true', true],
    ['an object', { a: 1 }],
    ['a string', 'published'],
  ];

  it.each(notLists)(
    'opens a checkbox group with nothing chosen when it is %s',
    async (_, value) => {
      seed('checkbox_stored', { status: { value } });
      const { user, load } = await renderFiltersGrid({
        entities: [filterCheckboxGroup({ id: 'status', label: 'Status', options })],
        name: 'checkbox_stored',
      });

      await user.click(chip('Status'));

      expect(await screen.findByRole('checkbox', { name: 'Published' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Draft' })).not.toBeChecked();

      await user.click(screen.getByRole('checkbox', { name: 'Published' }));
      await waitFor(() => expect(lastFilters(load)).toEqual({ status: { value: ['published'] } }));
      expect(screen.getByRole('checkbox', { name: 'Published' })).toBeChecked();
    },
  );

  it.each(notLists)('opens a tag group with nothing chosen when it is %s', async (_, value) => {
    seed('tags_stored', { tags: { value } });
    const { user, load } = await renderFiltersGrid({
      entities: [filterTagGroup({ id: 'tags', label: 'Tags', options })],
      name: 'tags_stored',
    });

    await user.click(chip('Tags'));

    expect(await screen.findByRole('checkbox', { name: 'Published' })).not.toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: 'Draft' }));
    await waitFor(() => expect(lastFilters(load)).toEqual({ tags: { value: ['draft'] } }));
  });

  it('opens a radio tag group with nothing chosen', async () => {
    seed('radio_stored', { mode: { value: 5 } });
    const { user } = await renderFiltersGrid({
      entities: [filterTagGroup({ id: 'mode', label: 'Mode', options, mode: 'radio' })],
      name: 'radio_stored',
    });

    await user.click(chip('Mode'));

    expect(await screen.findByRole('radio', { name: 'Published' })).not.toBeChecked();
  });

  it('opens the sections of the All filters panel with nothing chosen', async () => {
    seed('panel_stored', { status: { value: 5 }, tags: { value: { a: 1 } } });
    const { user } = await renderFiltersGrid({
      entities: [
        filterCheckboxGroup({ id: 'status', label: 'Status', options }),
        filterTagGroup({ id: 'tags', label: 'Tags', options: [{ label: 'Red', value: 'red' }] }),
      ],
      name: 'panel_stored',
    });

    await user.click(screen.getByRole('button', { name: /^All filters/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Status/ }));
    await user.click(within(dialog).getByRole('button', { name: /^Tags/ }));

    expect(within(dialog).getByRole('checkbox', { name: 'Published' })).not.toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Red' })).not.toBeChecked();
  });
});

describe('a filter whose stored value is of another shape than its own', () => {
  it('opens a date range with no selection when its bounds are not dates', async () => {
    const stored: [string, unknown][] = [
      ['text', { from: 'garbage', to: 'also garbage' }],
      ['numbers', { from: 123, to: 456 }],
      ['objects', { from: {}, to: [] }],
      ['a string', '2024-01-01'],
      ['a number', 5],
    ];

    for (const [index, [, value]] of stored.entries()) {
      const name = `range_stored_${index}`;
      seed(name, { when: { value } });
      const { user, unmount } = await renderFiltersGrid({
        entities: [filterDateRange({ id: 'when', label: 'When' })],
        name,
      });

      await user.click(chip('When'));

      // The calendar is on this month, as it is with nothing chosen.
      expect(await screen.findByText(format(new Date(), 'MMMM yyyy'))).toBeInTheDocument();
      expect(document.querySelector('[aria-selected="true"]')).toBeNull();
      unmount();
    }
  });

  it('opens a date range on the month of a stored start, whatever the end is', async () => {
    seed('range_half', { when: { value: { from: '2020-03-10', to: 'garbage' } } });
    const { user } = await renderFiltersGrid({
      entities: [filterDateRange({ id: 'when', label: 'When' })],
      name: 'range_half',
    });

    await user.click(chip('When'));

    expect(await screen.findByText('March 2020')).toBeInTheDocument();
  });

  it('shows a search box with whatever was stored for it, as text', async () => {
    seed('search_odd', { query: { value: { a: 1 } } });
    const { user } = await renderFiltersGrid({
      entities: [filterSearch({ id: 'query', label: 'Query' })],
      name: 'search_odd',
    });

    await user.click(chip('Query'));

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });
});

describe('a stored `filters` value that is not a record of filters', () => {
  it.each([
    ['a string', '"abc"'],
    ['a number', '5'],
    ['null', 'null'],
    ['true', 'true'],
    ['not JSON', '{oops'],
    ['a state that is null', '{"flag":null}'],
    ['a state that is a number', '{"flag":5}'],
    ['a state with no value', '{"flag":{"x":1}}'],
  ])('loads the grid as if nothing were stored when it is %s', async (_, raw) => {
    seed('shape_stored', raw);
    const { user, load } = await renderFiltersGrid({
      entities: [filterToggle({ id: 'flag', label: 'Flag' })],
      name: 'shape_stored',
    });

    expect(lastFilters(load)).toBeUndefined();
    expect(screen.getByRole('table')).toBeInTheDocument();

    await user.click(chip('Flag'));
    await waitFor(() => expect(lastFilters(load)).toEqual({ flag: { value: true } }));
  });
});
