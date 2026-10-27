import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine, so how the action bar is sized next to the toolbar and the table is
// only observable in the CSS text.
const here = dirname(fileURLToPath(import.meta.url));

function declarationsIn(file: string, selector: string) {
  const css = readFileSync(file, 'utf-8');
  const rule = extractRules(css).find((candidate) => candidate.selector === selector);
  if (!rule) throw new Error(`No rule for ${selector} in ${file}`);
  return declarationMap(rule.body);
}

function declarationsOf(selector: string) {
  return declarationsIn(join(here, 'data-grid-row-select-top.module.css'), selector);
}

describe('data-grid-row-select-top.module.css -- the action bar takes its own height', () => {
  it('does not grow, so it keeps its place in the wrapper the layout gives it', () => {
    // The layout puts the bar in a wrapper as tall as the toolbar it replaces, beside the main view
    // in the grid's column. That wrapper takes no more than it needs, so the table does not move;
    // a `flex-grow` on the bar would make it fill the wrapper and lose its centring in it.
    const container = declarationsOf('.container');
    expect(container.get('flex-grow')).toBeUndefined();
    expect(container.get('flex')).toBeUndefined();
    expect(container.get('display')).toBe('flex');
  });

  it('holds the bar to the height of a control, which the content then grows from', () => {
    expect(declarationsOf('.rowSelectTop').get('min-block-size')).toBe('var(--control-height-sm)');
  });

  it('ends with the room the toolbar leaves under it, so the bar is as tall as a toolbar of small buttons', () => {
    // The toolbar is its items and a margin under them. The bar is as tall as a toolbar whose tallest
    // item is a small button only while its own space under its content is that margin; if the two
    // drift apart the table jumps by the difference when the bar replaces such a toolbar. The two
    // values are written in two stylesheets, so this is where they are held equal.
    const toolbarMargin = declarationsIn(
      join(here, '..', '..', '..', 'services', 'layout', 'components', 'data-grid-layout-top-default.module.css'),
      '.dataGridTopDefault',
    ).get('margin-block-end');

    expect(toolbarMargin).toBe('var(--space-2)');
    expect(declarationsOf('.rowSelectTop').get('padding-block-end')).toBe(toolbarMargin);
  });
});
