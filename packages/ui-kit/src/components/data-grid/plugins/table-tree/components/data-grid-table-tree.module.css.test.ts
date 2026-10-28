import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine, no :dir() and applies no stylesheet, so which way the chevron turns,
// how far a level is indented and how tall a row with a toggle is are only observable in the CSS
// text.
const here = dirname(fileURLToPath(import.meta.url));
const rules = extractRules(readFileSync(join(here, 'data-grid-table-tree.module.css'), 'utf-8'));

function declarationsOf(selector: string) {
  const rule = rules.find((candidate) => candidate.selector === selector);
  if (!rule) throw new Error(`No rule for ${selector}`);
  return declarationMap(rule.body);
}

describe('data-grid-table-tree.module.css', () => {
  it('turns a collapsed row\'s chevron towards inline-end, which is the other way in right-to-left', () => {
    expect(declarationsOf('.expandIconCollapsed').get('transform')).toBe('rotate(-90deg)');
    expect(declarationsOf('.expandIconCollapsed:dir(rtl)').get('transform')).toBe('rotate(90deg)');
  });

  it('indents a level by one --space-6, which the row multiplies by the level', () => {
    const spacer = declarationsOf('.indentSpacer');
    expect(spacer.get('--_data-grid-table-tree-indent')).toBe('var(--space-6)');
    // A deep level in a narrow column must not squeeze the spacer to nothing.
    expect(spacer.get('flex-shrink')).toBe('0');
  });

  it('indents further than a toggle and its margin take, so a child starts after its parent\'s label', () => {
    // A parent's label starts after its toggle and the margin behind it; a child, whose toggle or
    // text starts one level in, must start after that and not before it. Resolved from the
    // stylesheet and the theme, since jsdom lays nothing out.
    // The sizes are the theme's invariants, the `:root` block that holds no colour.
    const themeRules = extractRules(
      readFileSync(join(here, '..', '..', '..', '..', '..', 'styles', 'theme.css'), 'utf-8'),
    );
    const invariants = declarationMap(themeRules.find((rule) => rule.selector === ':root')?.body ?? '');
    const rem = (value: string | undefined) => {
      const resolved = /^var\((--[a-z0-9-]+)\)$/.exec(value ?? '');
      const token = resolved ? invariants.get(resolved[1]) : undefined;
      if (!token?.endsWith('rem')) throw new Error(`${value} is not a rem token of the theme`);
      return parseFloat(token);
    };
    const toggle = rem(declarationsOf('.expand .toggle').get('inline-size'));
    const margin = rem(declarationsOf('.expand').get('margin-inline-end'));
    const indent = rem(declarationsOf('.indentSpacer').get('--_data-grid-table-tree-indent'));

    expect(indent).toBeGreaterThan(toggle + margin);
  });

  it('takes no more of the cell than a line of text, so no row that has a toggle is taller', () => {
    // The kit's cell is a line of this height between its padding, and the toggle is a square of it.
    const toggle = declarationsOf('.expand .toggle');
    expect(toggle.get('block-size')).toBe('var(--text-meta-line-height)');
    expect(toggle.get('inline-size')).toBe('var(--text-meta-line-height)');
    // It does not shrink away in a narrow column, nor is it put in a padding of the cell's own.
    expect(declarationsOf('.expand').get('flex-shrink')).toBe('0');
    expect(rules.some((rule) => /toggleCell/.test(rule.selector))).toBe(false);
  });

  it('draws the toggle\'s focus ring inside its box, where the cell\'s clipping cannot reach it', () => {
    // The Button's own ring is outside, `outline-offset: 2px`; here the offset is minus the ring's
    // width, so the ring lies in the box. The class chain outranks the Button's rule.
    expect(declarationsOf('.expand .toggle:focus-visible').get('outline-offset')).toBe(
      'calc(var(--border-width-focus) * -1)',
    );
  });

  describe('a clickable row', () => {
    // The same ring the row click plugin draws on its own rows, on the cells and not on the row.
    const ring = 'var(--border-width-focus) solid var(--ring)';

    it('has a pointer cursor and no outline of its own', () => {
      expect(declarationsOf('.clickableRow').get('cursor')).toBe('pointer');
      expect(declarationsOf('.clickableRow:focus-visible').get('outline')).toBe('none');
    });

    it('draws the ring on its cells, closed at the two ends by the first and the last, in either writing direction', () => {
      const cell = declarationsOf('.clickableRow:focus-visible > *::after');
      expect(cell.get('border-block')).toBe(ring);
      expect(cell.get('position')).toBe('absolute');
      expect(cell.get('pointer-events')).toBe('none');
      expect(
        declarationsOf('.clickableRow:focus-visible > :first-child::after').get('border-inline-start'),
      ).toBe(ring);
      expect(
        declarationsOf('.clickableRow:focus-visible > :last-child::after').get('border-inline-end'),
      ).toBe(ring);
    });

    it('positions a cell for the ring without taking `position: sticky` from a pinned one', () => {
      expect(declarationsOf(':where(.clickableRow:focus-visible) > td').get('position')).toBe(
        'relative',
      );
    });
  });
});
