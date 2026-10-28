import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine, so the height a row takes is only observable in the CSS text.
const here = dirname(fileURLToPath(import.meta.url));

function declarationsOf(file: string, selector: string) {
  const rule = extractRules(readFileSync(file, 'utf-8')).find(
    (candidate) => candidate.selector === selector,
  );
  if (!rule) throw new Error(`No rule for ${selector} in ${file}`);
  return declarationMap(rule.body);
}

describe('data-grid-row-select-body.module.css', () => {
  it('holds the checkbox to one line of cell text, so a row of checkboxes is as tall as a row of text', () => {
    // A wrapper taller than the line (24px around the kit's 16px checkbox) makes every row 8px
    // taller than the kit's own row, which is the line plus the cell's padding.
    const line = declarationsOf(
      join(here, '..', '..', '..', '..', 'table', 'table.module.css'),
      '.table',
    ).get('line-height');
    const cell = declarationsOf(join(here, 'data-grid-row-select-body.module.css'), '.cell');

    expect(line).toBe('var(--text-meta-line-height)');
    expect(cell.get('block-size')).toBe(line);
  });
});
