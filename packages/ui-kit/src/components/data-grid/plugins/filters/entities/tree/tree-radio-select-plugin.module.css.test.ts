import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../../__test-utils__/css-rules';

// jsdom has no layout engine, so whether a tree row's label sits beside its radio is only
// observable in the CSS text.
const here = dirname(fileURLToPath(import.meta.url));

function declarationsOf(file: string, selector: string) {
  const rule = extractRules(readFileSync(file, 'utf-8')).find(
    (candidate) => candidate.selector === selector,
  );
  if (!rule) throw new Error(`No rule for ${selector} in ${file}`);
  return declarationMap(rule.body);
}

describe('tree-radio-select-plugin.module.css', () => {
  it("takes the radio group of a row out of the kit's full-width grid, so the label follows the radio", () => {
    const kitGroup = declarationsOf(
      join(here, '..', '..', '..', '..', '..', 'radio-group', 'radio-group.module.css'),
      '.group',
    );
    const group = declarationsOf(
      join(here, 'tree-radio-select-plugin.module.css'),
      '.radioGroup.radioGroup',
    );

    // What has to be undone, and that it is.
    expect(kitGroup.get('width')).toBe('100%');
    expect(group.get('width')).toBe('auto');
    expect(group.get('flex')).toBe('none');
  });

  it('lets a label with no break to wrap at break anywhere, rather than run out of the row', () => {
    const text = declarationsOf(join(here, 'tree-radio-select-plugin.module.css'), '.text');

    expect(text.get('overflow-wrap')).toBe('anywhere');
    expect(text.get('min-inline-size')).toBe('0');
  });
});
