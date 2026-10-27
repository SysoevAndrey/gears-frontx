import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine, so what the measured box contains is only observable in the CSS text.
const rules = extractRules(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'data-grid-layout-top.module.css'),
    'utf-8',
  ),
);

function declarationsOf(selector: string) {
  const rule = rules.find((candidate) => candidate.selector === selector);
  if (!rule) throw new Error(`No rule for ${selector}`);
  return declarationMap(rule.body);
}

describe('data-grid-layout-top.module.css', () => {
  it('measures a box that contains the toolbar\'s bottom margin, whatever the box is laid out in', () => {
    // The size the layout reads is the room the toolbar takes, its margin included, only if the
    // wrapper is a formatting context of its own; `flow-root` makes it one without leaning on its
    // parent being a flex container.
    expect(declarationsOf('.wrapper').get('display')).toBe('flow-root');
  });

  it('lets a replacing slot keep its own display, and centres what it holds', () => {
    const order = (selector: string) => rules.findIndex((rule) => rule.selector === selector);
    // Same specificity as `.wrapper`, so the later rule wins the display.
    expect(order('.replacement')).toBeGreaterThan(order('.wrapper'));
    expect(declarationsOf('.replacement').get('display')).toBe('flex');
    expect(declarationsOf('.replacement').get('justify-content')).toBe('center');
  });
});
