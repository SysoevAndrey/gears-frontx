import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine, so how tall the line that holds the number is, is only observable
// in the CSS text.
const here = dirname(fileURLToPath(import.meta.url));
const rules = extractRules(readFileSync(join(here, 'data-grid-row-number-cell.module.css'), 'utf-8'));
const number = declarationMap(rules.find((rule) => rule.selector === '.rowNumber')?.body ?? '');

describe('data-grid-row-number-cell.module.css', () => {
  it('top-aligns the number, so its mono face adds no half pixel to the cell\'s line', () => {
    // On the baseline, an inline box in another face than the line's makes the line taller than
    // its line-height, and the row with it (41.5px for the kit's 41).
    expect(number.get('vertical-align')).toBe('top');
  });

  it('is an inline-block, which keeps its width the number\'s own, the width the column is sized by', () => {
    // A block would be as wide as the cell, so the column would measure itself.
    expect(number.get('display')).toBe('inline-block');
    expect(number.get('font-family')).toBe('var(--font-mono)');
    expect(number.get('white-space')).toBe('nowrap');
  });
});
