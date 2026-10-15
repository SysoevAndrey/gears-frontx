import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { declaredIn } from '../../../../../__test-utils__/css-rules';
import { render } from '../../../../../__test-utils__/render-with-user';
import { messages } from '../../../messages';
import { Pager } from './pager';

// jsdom has no layout engine, so how the page buttons wrap in a narrow grid is only observable in
// the CSS text, plus the markup that puts the right class on the right element. Whether the pager
// row itself wraps is pinned in pager.module.css.test.ts.
const declared = declaredIn(import.meta.url, 'pager.module.css');

describe('the page buttons in a narrow grid', () => {
  it('balances them over their lines, so none is left alone on the last', () => {
    // Only inline content can be balanced; a flex row fills a line before starting the next.
    expect(declared('.pages.pages', 'display')).toBe('block');
    expect(declared('.pages.pages', 'text-wrap')).toBe('balance');
    expect(declared('.pages.pages', 'text-align')).toBe('center');
    expect(declared('.pages > li', 'display')).toBe('inline-flex');
  });

  it('keeps a pager that fits as tall and wide as the flex row it replaces', () => {
    // Each button's gap to the next is a margin, and the list takes the last one back.
    expect(declared('.pages.pages', 'margin-inline-end')).toBe('calc(var(--space-1) * -1)');
    expect(declared('.pages.pages', 'margin-block-end')).toBe('calc(var(--space-1) * -1)');
    expect(declared('.pages > li', 'margin-inline-end')).toBe('var(--space-1)');
    expect(declared('.pages > li', 'margin-block-end')).toBe('var(--space-1)');
  });

  it('puts the balancing class on the list of page buttons', () => {
    render(
      <Pager
        total={100}
        page={1}
        limit={10}
        limits={[10, 20]}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
      />,
    );

    const list = within(
      screen.getByRole('navigation', { name: messages.pagination.ariaLabel }),
    ).getByRole('list');

    expect(list.className).toMatch(/pages/);
  });
});
