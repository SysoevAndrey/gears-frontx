import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../__test-utils__/css-rules';

// jsdom computes no custom properties, so the indentation is worked out here from the stylesheets:
// the same chain the browser follows (the tree's start, a directory's step, the directory's
// children inheriting it), evaluated for the first few levels.
const here = dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(join(here, file), 'utf-8');

function declarationsOf(css: string, selector: string) {
  const rule = extractRules(css).find((candidate) => candidate.selector === selector);
  if (!rule) throw new Error(`No rule for ${selector}`);
  return declarationMap(rule.body);
}

const theme = readFileSync(join(here, '../../../../styles/theme.css'), 'utf-8');
const tokens = new Map(
  Array.from(theme.matchAll(/(--space-\d+):\s*([\d.]+)rem;/g), (m) => [
    m[1],
    `${Number(m[2]) * 16}px`,
  ]),
);

/**
 * Evaluates a `calc` of px values and `var()`s: each variable is worked out first (against `vars`,
 * then the tokens, then its fallback) and put back as one number, so a subtracted `calc` keeps its
 * sign.
 */
function px(value: string, vars: Map<string, string>): number {
  const resolved = value.replace(
    /var\((--[\w-]+)(?:,\s*([^()]*))?\)/g,
    (_, name: string, fallback?: string) =>
      `${px(vars.get(name) ?? tokens.get(name) ?? fallback ?? '0px', vars)}px`,
  );
  const terms = resolved.replace(/calc|[()\s]/g, '').match(/[+-]?[\d.]+px/g) ?? [];
  return terms.reduce((sum, term) => sum + Number.parseFloat(term), 0);
}

const CHILDREN = '--_data-grid-tree-padding-children';
const PARENT = '--_data-grid-tree-padding-parent';
const DELTA = '--_data-grid-tree-directory-delta';
// The shared declaration reader stops a custom property's name at its `_`, so `--_foo` reads as `foo`.
const declared = (name: string) => name.replace('--_', '');

describe('the tree indentation', () => {
  const main = declarationsOf(read('tree-main.module.css'), '.treeMain');
  const directory = declarationsOf(read('tree-nodes.module.css'), '.treeNodeDirectory');
  const children = declarationsOf(read('tree-nodes.module.css'), '.treeNodeDirectoryChildren');

  // What the tree's own rule declares, under the names the stylesheets read it by.
  const mainVars = new Map([...main].map(([name, value]) => [`--_${name}`, value] as const));

  function insets(levels: number) {
    const delta = px(`var(${DELTA})`, mainVars);
    let inset = px(`var(${CHILDREN})`, mainVars);
    const result = [inset];
    for (let level = 1; level < levels; level += 1) {
      const parent = px(
        directory.get(declared(PARENT)) ?? '',
        new Map([
          [CHILDREN, `${inset}px`],
          [DELTA, `${delta}px`],
        ]),
      );
      inset = px(children.get(declared(CHILDREN)) ?? '', new Map([[PARENT, `${parent}px`]]));
      result.push(inset);
    }
    return result;
  }

  it('steps every level in by the same amount, the first one included', () => {
    const levels = insets(6);
    const steps = levels.slice(1).map((inset, index) => inset - (levels[index] ?? 0));

    // Padding clamps at zero, so an inset that is negative anywhere hides a shorter step.
    expect(Math.min(...levels)).toBeGreaterThanOrEqual(0);
    expect(levels[0]).toBe(0);
    expect(new Set(steps)).toEqual(new Set([28]));
  });
});
