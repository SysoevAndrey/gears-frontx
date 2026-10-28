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

// The sizes are the theme's invariants, the `:root` block that holds no colour.
function invariantTokens() {
  const themeRules = extractRules(
    readFileSync(join(here, '..', '..', '..', '..', '..', 'styles', 'theme.css'), 'utf-8'),
  );
  return declarationMap(themeRules.find((rule) => rule.selector === ':root')?.body ?? '');
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
    const invariants = invariantTokens();
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

  it('lets the label give way and ellipsize where the column does not wrap, which the cell\'s block cannot do for it', () => {
    // A flex item, which can shrink below its text, and so can be clipped.
    const label = declarationsOf('.label');
    expect(label.get('min-inline-size')).toBe('0');
    expect(label.get('flex')).toBe('1 1 auto');
    // The ellipsis is on the label, and only under the cell's own nowrap marker, so a wrapping
    // column's label is not clipped.
    const nowrap = declarationsOf("[data-overflow='nowrap'] .label");
    expect(nowrap.get('overflow')).toBe('hidden');
    expect(nowrap.get('text-overflow')).toBe('ellipsis');
    expect(label.has('overflow')).toBe(false);
  });

  it('gives the toggle a 24px hit area with a pseudo-element, which takes no room', () => {
    // A box over the toggle, centred on it by equal offsets, that shows nothing and moves nothing.
    const area = declarationsOf('.expand .toggle::after');
    expect(area.get('content')).toBe("''");
    expect(area.get('position')).toBe('absolute');
    // The offset counts from the padding box, so it carries the 1px border of the Button as well as
    // the --space-1 the square reaches past the toggle.
    expect(area.get('inset')).toBe('calc(-1 * (var(--space-1) + var(--border-width)))');
    expect(area.has('background')).toBe(false);

    // The square is the toggle's line and --space-1 each side: at least 1.5rem, 24px at a 16px root.
    const rem = (token: string) => {
      const value = invariantTokens().get(token);
      if (!value?.endsWith('rem')) throw new Error(`${token} is not a rem token of the theme`);
      return parseFloat(value);
    };
    expect(rem('--text-meta-line-height') + 2 * rem('--space-1')).toBeGreaterThanOrEqual(1.5);
    // It ends where the label begins and no further: the toggle's margin is the same --space-1.
    expect(declarationsOf('.expand').get('margin-inline-end')).toBe('var(--space-1)');
  });

  it('lets the square out of a nowrap cell\'s clipping by as much as the square reaches', () => {
    const clip = declarationsOf("[data-overflow='nowrap'] > span:has(> .treeCellContent)");
    expect(clip.get('overflow')).toBe('clip');
    expect(clip.get('overflow-clip-margin')).toBe('var(--space-1)');
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
