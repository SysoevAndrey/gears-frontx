import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine, so the popover's width rules are only observable in the CSS text.
const here = dirname(fileURLToPath(import.meta.url));

function declarationsOf(file: string, selector: string) {
  const rule = extractRules(readFileSync(file, 'utf-8')).find(
    (candidate) => candidate.selector === selector,
  );
  if (!rule) throw new Error(`No rule for ${selector} in ${file}`);
  return declarationMap(rule.body);
}

describe('adaptive-popover.module.css', () => {
  const popover = declarationsOf(join(here, 'adaptive-popover.module.css'), '.popover.popover');
  const kitPopup = declarationsOf(
    join(here, '..', '..', '..', '..', 'popover', 'popover.module.css'),
    '.popup',
  );

  it('grows to its content, up to the room there is, instead of keeping the kit width', () => {
    expect(kitPopup.get('width')).toBe('18rem');
    expect(popover.get('width')).toBe('auto');
    expect(popover.get('max-inline-size')).toBe('var(--available-width)');
  });

  it('keeps the kit width as its floor, so a short list looks as it always did', () => {
    expect(popover.get('min-inline-size')).toBe(kitPopup.get('width'));
  });
});
