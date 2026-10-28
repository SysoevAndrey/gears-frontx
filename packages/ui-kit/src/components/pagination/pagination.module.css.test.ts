import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declaredIn } from '../../__test-utils__/css-rules';

// jsdom lays nothing out and resolves no container, so whether the Previous/Next labels follow
// the pagination's own width is a property of the stylesheet text alone; reading the source is
// the guard a rendered test cannot reach. Same approach as the grid pager's
// pager.module.css.test.ts.
describe('pagination.module.css', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const declared = declaredIn(import.meta.url, 'pagination.module.css');
  const css = readFileSync(join(here, 'pagination.module.css'), 'utf8');

  it('measures the pagination itself as the query container for its Previous/Next labels', () => {
    // The root is the container, so the labels below read the width the pagination was given,
    // not the viewport's.
    expect(declared('.pagination', 'container-type')).toBe('inline-size');
    expect(declared('.pagination', 'container-name')).toBe('pagination');
  });

  it('lets the root width decide the Previous/Next label inside a root, the viewport outside one', () => {
    // A bare part keeps the viewport rule: hidden by default, shown from a 640px viewport.
    expect(declared('.previousNextText', 'display')).toBe('none');
    const media = css.search(/@media \(min-width: 640px\) \{\s*\.previousNextText \{\s*display: block;/);
    expect(media).toBeGreaterThan(-1);
    // Inside the root the container queries answer both ways, and they come after the viewport
    // rule, which they tie, so they win there: a narrow container on a wide screen hides the
    // label (the overflow this guards against), a wide container on a narrow screen shows it.
    const hide = css.search(
      /@container pagination \(width < 640px\) \{\s*\.previousNextText \{\s*display: none;/,
    );
    const show = css.search(
      /@container pagination \(width >= 640px\) \{\s*\.previousNextText \{\s*display: block;/,
    );
    expect(hide).toBeGreaterThan(media);
    expect(show).toBeGreaterThan(media);
  });
});
