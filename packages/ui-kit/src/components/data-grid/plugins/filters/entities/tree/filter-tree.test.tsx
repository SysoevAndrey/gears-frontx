import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { lastFilters, renderFiltersGrid } from '../../../../../../__test-utils__/filters-grid';
import { messages } from '../../../../messages';
import { createDataGridTreeStructure } from '../../../../tree-structure/tree-structure';
import type { DataGridTreeItem } from '../../../../tree-structure/tree-structure-types';
import { filterTree } from './filter-tree';

interface Category extends DataGridTreeItem {
  id: string;
  name: string;
  parentId: string | null;
}

// company
// ├── engineering
// │   ├── frontend
// │   └── backend
// └── design
// freelance
const categories: Category[] = [
  { id: 'company', name: 'Company', parentId: null },
  { id: 'engineering', name: 'Engineering', parentId: 'company' },
  { id: 'frontend', name: 'Frontend', parentId: 'engineering' },
  { id: 'backend', name: 'Backend', parentId: 'engineering' },
  { id: 'design', name: 'Design', parentId: 'company' },
  { id: 'freelance', name: 'Freelance', parentId: null },
];

function createTree(items: Category[] = categories) {
  return createDataGridTreeStructure<Category>({ items, itemKey: 'id', parentKey: 'parentId' });
}

type Config = Parameters<typeof filterTree<Category>>[0];

function categoryFilter(overrides: Partial<Config> = {}) {
  return filterTree<Category>({
    id: 'category',
    label: 'Category',
    tree: createTree(),
    treeLabel: 'name',
    ...overrides,
  });
}

// The search box applies after 300 ms of no typing, in real time (see the search filter's tests).
const afterSearchDebounce = { timeout: 2000 };

function chip() {
  return screen.getByRole('button', { name: /^Category/ });
}

function rowNames() {
  return screen.queryAllByRole('treeitem').map((row) => row.textContent);
}

async function expand(user: Awaited<ReturnType<typeof renderFiltersGrid>>['user'], name: string) {
  const row = screen.getByRole('treeitem', { name });
  await user.click(within(row).getByRole('button', { name: messages.tree.expand }));
}

beforeEach(() => {
  localStorage.clear();
});

describe('filterTree', () => {
  it('takes its key from the id, and keeps the label it is given', () => {
    const entity = categoryFilter();

    expect(entity.id).toBe('category');
    expect(entity.filterKey).toBe('category');
    expect(entity.label).toBe('Category');
    expect(entity.filterComponent).toBeDefined();
    expect(entity.dialogFilterComponent).toBeDefined();
    expect(categoryFilter({ filterKey: 'cat' }).filterKey).toBe('cat');
  });

  it('turns on the search box above five nodes, unless told otherwise', () => {
    expect(categoryFilter().params.search).toBe(true);
    expect(categoryFilter({ tree: createTree(categories.slice(0, 5)) }).params.search).toBe(false);
    expect(categoryFilter({ search: false }).params.search).toBe(false);
    expect(
      categoryFilter({ tree: createTree(categories.slice(0, 2)), search: true }).params.search,
    ).toBe(true);
  });

  it('transforms the load value only when it is given a way to', () => {
    expect(categoryFilter().resolveLoadValue).toBeUndefined();
    expect(categoryFilter({ filterValue: 'name' }).resolveLoadValue).toBeDefined();
  });
});

describe('the tree filter in a grid', () => {
  it('opens a tree of its nodes, each with a radio, a directory opened from its chevron', async () => {
    const { user } = await renderFiltersGrid({ entities: [categoryFilter()] });

    await user.click(chip());

    expect(await screen.findByRole('tree')).toBeInTheDocument();
    expect(rowNames()).toEqual(['Company', 'Freelance']);
    expect(screen.getAllByRole('radio')).toHaveLength(2);

    await expand(user, 'Company');

    expect(rowNames()).toEqual(['Company', 'Engineering', 'Design', 'Freelance']);
    expect(screen.getByRole('treeitem', { name: 'Engineering' })).toHaveAttribute(
      'aria-level',
      '2',
    );
  });

  it('applies the chosen node at once, a new choice replacing the old, and shows the filter on', async () => {
    const { user, load, storageKey } = await renderFiltersGrid({ entities: [categoryFilter()] });
    await user.click(chip());
    await screen.findByRole('tree');

    await user.click(screen.getByRole('radio', { name: 'Freelance' }));

    await waitFor(() => expect(lastFilters(load)).toEqual({ category: { value: 'freelance' } }));
    expect(screen.getByRole('radio', { name: 'Freelance' })).toBeChecked();
    expect(chip().className).toContain('active');
    expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual({
      category: { value: 'freelance' },
    });

    await user.click(screen.getByRole('radio', { name: 'Company' }));

    await waitFor(() => expect(lastFilters(load)).toEqual({ category: { value: 'company' } }));
    expect(screen.getByRole('radio', { name: 'Freelance' })).not.toBeChecked();
  });

  it("keeps a row's label beside its radio: the group is no wider than the radio, the text breaks anywhere", async () => {
    const { user } = await renderFiltersGrid({ entities: [categoryFilter()] });
    await user.click(chip());
    await screen.findByRole('tree');

    const group = screen.getByRole('radio', { name: 'Freelance' }).closest('[role="radiogroup"]');

    // The rules these classes carry are pinned in tree-radio-select-plugin.module.css.test.ts.
    expect(group?.className).toMatch(/radioGroup/);
    expect(screen.getByText('Freelance').className).toMatch(/text/);
  });

  it('selects the node with the keyboard: Tab to its radio, then Space', async () => {
    const { user, load } = await renderFiltersGrid({ entities: [categoryFilter()] });
    await user.click(chip());
    await screen.findByRole('tree');

    screen.getByRole('treeitem', { name: 'Company' }).focus();
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Company' })).toHaveFocus();
    await user.keyboard(' ');

    await waitFor(() => expect(lastFilters(load)).toEqual({ category: { value: 'company' } }));
  });

  it('opens on the node stored for it, checked, with the filter on', async () => {
    localStorage.setItem(
      'dataGrid:tree_stored:filters',
      JSON.stringify({ category: { value: 'design' } }),
    );
    const { user, load } = await renderFiltersGrid({
      entities: [categoryFilter()],
      name: 'tree_stored',
    });
    expect(lastFilters(load)).toEqual({ category: { value: 'design' } });
    expect(chip().className).toContain('active');

    await user.click(chip());
    await screen.findByRole('tree');
    await expand(user, 'Company');

    expect(screen.getByRole('radio', { name: 'Design' })).toBeChecked();
  });

  it('shows the placeholder for a tree with no nodes', async () => {
    const { user } = await renderFiltersGrid({
      entities: [categoryFilter({ tree: createTree([]) })],
    });

    await user.click(chip());

    expect(await screen.findByText(messages.tree.noItems)).toBeInTheDocument();
  });

  it('follows a tree whose items are replaced while it is open', async () => {
    const tree = createTree();
    const { user } = await renderFiltersGrid({ entities: [categoryFilter({ tree })] });
    await user.click(chip());
    await screen.findByRole('tree');

    act(() => tree.setItems([...categories, { id: 'legal', name: 'Legal', parentId: null }]));

    expect(rowNames()).toEqual(['Company', 'Freelance', 'Legal']);
  });

  describe('what load is sent', () => {
    it('is the node id, unless a filterValue says otherwise, and the id is what is stored', async () => {
      const { user, load, storageKey } = await renderFiltersGrid({
        entities: [categoryFilter({ filterValue: 'name' })],
      });
      await user.click(chip());
      await screen.findByRole('tree');

      await user.click(screen.getByRole('radio', { name: 'Freelance' }));

      await waitFor(() => expect(lastFilters(load)).toEqual({ category: { value: 'Freelance' } }));
      expect(JSON.parse(localStorage.getItem(storageKey) ?? 'null')).toEqual({
        category: { value: 'freelance' },
      });
    });

    it('is what a filterValue function makes of the node item', async () => {
      const { user, load } = await renderFiltersGrid({
        entities: [
          categoryFilter({ filterValue: (item) => `${item.parentId ?? 'root'}/${item.id}` }),
        ],
      });
      await user.click(chip());
      await screen.findByRole('tree');

      await user.click(screen.getByRole('radio', { name: 'Freelance' }));

      await waitFor(() =>
        expect(lastFilters(load)).toEqual({ category: { value: 'root/freelance' } }),
      );
    });

    it('falls back to the id when the node has no such property, or when it is not found', async () => {
      localStorage.setItem(
        'dataGrid:tree_unknown:filters',
        JSON.stringify({ category: { value: 'gone' } }),
      );
      const { load } = await renderFiltersGrid({
        entities: [categoryFilter({ filterValue: 'name' })],
        name: 'tree_unknown',
      });

      expect(lastFilters(load)).toEqual({ category: { value: 'gone' } });
    });
  });

  describe('search', () => {
    async function openWithSearch() {
      const rendered = await renderFiltersGrid({ entities: [categoryFilter()] });
      await rendered.user.click(chip());
      await screen.findByRole('tree');
      return rendered;
    }

    it('keeps what matches, the path down to it and the nodes under it, after 300 ms of no typing', async () => {
      const { user } = await openWithSearch();
      await expand(user, 'Company');
      await expand(user, 'Engineering');
      expect(rowNames()).toEqual([
        'Company',
        'Engineering',
        'Frontend',
        'Backend',
        'Design',
        'Freelance',
      ]);

      await user.type(screen.getByPlaceholderText(messages.filters.searchPlaceholder), 'front');

      // Not yet: the list only follows the box once typing has stopped.
      expect(rowNames()).toContain('Backend');
      await waitFor(
        () => expect(rowNames()).toEqual(['Company', 'Engineering', 'Frontend']),
        afterSearchDebounce,
      );
    });

    it('is not case sensitive, and shows a whole branch when its directory matches', async () => {
      const { user } = await openWithSearch();
      await expand(user, 'Company');
      await expand(user, 'Engineering');

      await user.type(screen.getByPlaceholderText(messages.filters.searchPlaceholder), 'ENGINEER');

      await waitFor(
        () => expect(rowNames()).toEqual(['Company', 'Engineering', 'Frontend', 'Backend']),
        afterSearchDebounce,
      );
    });

    it('brings everything back when the box is emptied', async () => {
      const { user } = await openWithSearch();
      const box = screen.getByPlaceholderText(messages.filters.searchPlaceholder);
      await user.type(box, 'free');
      await waitFor(() => expect(rowNames()).toEqual(['Freelance']), afterSearchDebounce);

      await user.clear(box);

      await waitFor(
        () => expect(rowNames()).toEqual(['Company', 'Freelance']),
        afterSearchDebounce,
      );
    });

    it('matches on the label a function gives, not on a property', async () => {
      const { user } = await renderFiltersGrid({
        entities: [categoryFilter({ treeLabel: (item) => `Team ${item.id}` })],
      });
      await user.click(chip());
      await screen.findByRole('tree');

      await user.type(screen.getByPlaceholderText(messages.filters.searchPlaceholder), 'team free');

      await waitFor(() => expect(rowNames()).toEqual(['Team freelance']), afterSearchDebounce);
    });

    it('has no box in a small tree', async () => {
      const { user } = await renderFiltersGrid({
        entities: [categoryFilter({ tree: createTree(categories.slice(0, 3)) })],
      });

      await user.click(chip());
      await screen.findByRole('tree');

      expect(screen.queryByPlaceholderText(messages.filters.searchPlaceholder)).toBeNull();
    });
  });

  describe('in the All filters panel', () => {
    it('chooses into the draft, and applies on Apply', async () => {
      const { user, load } = await renderFiltersGrid({ entities: [categoryFilter()] });
      await user.click(screen.getByRole('button', { name: /^All filters/ }));
      const dialog = await screen.findByRole('dialog');
      const loads = load.mock.calls.length;

      await user.click(within(dialog).getByRole('button', { name: 'Category' }));
      await user.click(within(dialog).getByRole('radio', { name: 'Freelance' }));

      expect(load).toHaveBeenCalledTimes(loads);
      expect(
        within(dialog).getByRole('button', { name: messages.filters.close }),
      ).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: messages.filters.apply }));

      await waitFor(() => expect(lastFilters(load)).toEqual({ category: { value: 'freelance' } }));
    });
  });
});
