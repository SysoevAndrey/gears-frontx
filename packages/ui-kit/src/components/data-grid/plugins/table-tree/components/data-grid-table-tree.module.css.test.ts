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

  it('indents a level by one --space-8, which the row multiplies by the level', () => {
    const spacer = declarationsOf('.indentSpacer');
    expect(spacer.get('--_data-grid-table-tree-indent')).toBe('var(--space-8)');
    // A deep level in a narrow column must not squeeze the spacer to nothing.
    expect(spacer.get('flex-shrink')).toBe('0');
  });

  it('takes the block padding of the cell that holds a toggle down to --space-1, over the kit\'s', () => {
    // 2 x --space-1 and the small button's --control-height-sm add up to --control-height-lg, the
    // kit's cell height, so the row is no taller than one without a toggle. The attribute selector
    // is what lets it win over the kit's own single-class padding.
    expect(declarationsOf('.toggleCell[data-column-id]').get('padding-block')).toBe(
      'var(--space-1)',
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
