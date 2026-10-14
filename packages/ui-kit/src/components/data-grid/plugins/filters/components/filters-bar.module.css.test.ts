import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine, so the bar's behaviour when it has more chips than room is only
// observable in the CSS text.
const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'filters-bar.module.css'),
  'utf-8',
);

function declarationsOf(selector: string) {
  const rule = extractRules(css).find((candidate) => candidate.selector === selector);
  if (!rule) throw new Error(`No rule for ${selector}`);
  return declarationMap(rule.body);
}

describe('filters-bar.module.css', () => {
  it('wraps the chips onto further lines, and lets the bar be narrower than its chips', () => {
    const rule = extractRules(css).find((candidate) => candidate.selector === '.filterOptions');
    const declared = declarationMap(rule?.body ?? '');

    expect(declared.get('flex-wrap')).toBe('wrap');
    expect(declared.get('min-inline-size')).toBe('0');
  });

  it('sets the All filters chip apart with a wider gap than the one between chips', () => {
    const chips = declarationsOf('.filterOptions');
    const tail = declarationsOf('.tail');

    expect(chips.get('gap')).toBe('var(--space-2) var(--space-1)');
    // The column gap, second of the two values, is the larger one, from the same spacing scale.
    expect(tail.get('gap')).toBe('var(--space-2) var(--space-4)');
  });

  it('keeps that gap a gap: a margin on the chip would indent it at the start of a line', () => {
    expect(
      extractRules(css).filter((rule) => /margin|inset|translate|padding/.test(rule.body)),
    ).toEqual([]);
  });
});
