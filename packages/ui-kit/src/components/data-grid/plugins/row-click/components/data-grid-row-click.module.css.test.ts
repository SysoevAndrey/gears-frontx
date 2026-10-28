import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine and applies no stylesheet, so how a focused row is drawn is only
// observable in the CSS text.
const here = dirname(fileURLToPath(import.meta.url));
const rules = extractRules(readFileSync(join(here, 'data-grid-row-click.module.css'), 'utf-8'));

function declarationsOf(selector: string) {
  const rule = rules.find((candidate) => candidate.selector === selector);
  if (!rule) throw new Error(`No rule for ${selector}`);
  return declarationMap(rule.body);
}

describe('data-grid-row-click.module.css -- the focus ring of a clickable row', () => {
  const ring = 'var(--border-width-focus) solid var(--ring)';

  it('is the kit\'s ring, drawn on the cells and not on the row, which opaque pinned cells would cut', () => {
    // The row's own outline is switched off; each cell draws its share of the ring in its place.
    expect(declarationsOf('.clickableRow:focus-visible').get('outline')).toBe('none');

    const cell = declarationsOf('.clickableRow:focus-visible > *::after');
    expect(cell.get('border-block')).toBe(ring);
    expect(cell.get('position')).toBe('absolute');
    expect(cell.get('inset')).toBe('0');
    // It must never take a click or a hover from the cell under it.
    expect(cell.get('pointer-events')).toBe('none');
  });

  it('closes the ring at the row\'s two ends with the first and the last cell, in either writing direction', () => {
    expect(declarationsOf('.clickableRow:focus-visible > :first-child::after').get('border-inline-start')).toBe(ring);
    expect(declarationsOf('.clickableRow:focus-visible > :last-child::after').get('border-inline-end')).toBe(ring);
  });

  it('positions a cell for the ring without taking `position: sticky` from a pinned one', () => {
    // Inside :where(), so it has no specificity beyond the element and the kit's `.pinned` wins.
    expect(declarationsOf(':where(.clickableRow:focus-visible) > td').get('position')).toBe('relative');
  });

  it('takes the system highlight in forced-colors mode', () => {
    // The same selector again, inside the forced-colors media query.
    const forced = rules.filter(
      (rule) =>
        rule.selector === '.clickableRow:focus-visible > *::after' &&
        declarationMap(rule.body).get('border-color') === 'Highlight',
    );
    expect(forced).toHaveLength(1);
  });
});
