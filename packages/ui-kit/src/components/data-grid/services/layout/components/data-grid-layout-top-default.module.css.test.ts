import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine, so whether the toolbar wraps instead of overflowing is only
// observable in the CSS text. Each value is checked next to the reason it is there.
const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'data-grid-layout-top-default.module.css'),
  'utf-8',
);

function declarationsOf(selector: string) {
  const rule = extractRules(css).find((candidate) => candidate.selector === selector);
  if (!rule) throw new Error(`No rule for ${selector}`);
  return declarationMap(rule.body);
}

describe('data-grid-layout-top-default.module.css', () => {
  it('lets the end slots go on to a line of their own instead of squeezing the start slots', () => {
    expect(declarationsOf('.dataGridTopDefault').get('flex-wrap')).toBe('wrap');
    // Alone on a line they still sit at its end.
    expect(declarationsOf('.topEndSlots').get('margin-inline-start')).toBe('auto');
    expect(declarationsOf('.topEndSlots').get('flex-shrink')).toBe('0');
  });

  it('wraps the start slots, which may shrink below their content, instead of letting them overflow', () => {
    const start = declarationsOf('.topStartSlots');

    expect(start.get('flex-wrap')).toBe('wrap');
    // A flex item only wraps its own content once it is allowed to be narrower than it.
    expect(start.get('min-inline-size')).toBe('0');
    expect(start.get('flex')).toBe('1 1 auto');
  });

  it('keeps a toolbar that fits as it was: everything centred on one line, no gap between the sides', () => {
    const toolbar = declarationsOf('.dataGridTopDefault');

    expect(toolbar.get('align-items')).toBe('center');
    expect(declarationsOf('.topStartSlots').get('align-items')).toBe('center');
    expect(declarationsOf('.topEndSlots').get('align-items')).toBe('center');
    // Between lines only: a column gap would move the end slots away from the start slots.
    expect(toolbar.has('gap')).toBe(false);
    expect(toolbar.get('row-gap')).toBe('var(--space-2)');
  });
});
