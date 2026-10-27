import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine and applies no stylesheet, so what lets the panel fit its popover, be
// sized by a consumer and show its controls is only observable in the CSS text.
const here = dirname(fileURLToPath(import.meta.url));

function declarationsOf(file: string, selector: string) {
  const rule = extractRules(readFileSync(file, 'utf-8')).find(
    (candidate) => candidate.selector === selector,
  );
  if (!rule) throw new Error(`No rule for ${selector} in ${file}`);
  return declarationMap(rule.body);
}

// A value written over several lines, without the whitespace inside its brackets.
function flat(value: string | undefined) {
  return value?.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');
}

describe('data-grid-table-configuration.module.css', () => {
  const css = join(here, 'data-grid-table-configuration.module.css');
  const rule = (selector: string) => declarationsOf(css, selector);

  it('lets the popup grow to the panel, up to the room there is, instead of keeping the kit width', () => {
    const kitPopup = declarationsOf(
      join(here, '..', '..', '..', '..', 'popover', 'popover.module.css'),
      '.popup',
    );

    expect(kitPopup.get('width')).toBe('18rem');
    expect(rule('.popup.popup').get('width')).toBe('auto');
    // In both directions: a long list scrolls inside the popup rather than running off the screen.
    expect(rule('.popup.popup').get('max-inline-size')).toBe('var(--available-width)');
    expect(rule('.popup.popup').get('max-block-size')).toBe('var(--available-height)');
  });

  it('gives the width floor way to the room, so a narrow screen does not push the switches out', () => {
    expect(flat(rule('.tableConfiguration').get('min-inline-size'))).toBe(
      'min(var(--data-grid-table-configuration-min-inline-size, 304px), calc(var(--available-width, 100vw) - var(--space-6)))',
    );
  });

  it('lets the list shrink and scroll in the room the popup has, without a scrollbar across', () => {
    // The panel is a column, and a column's children only shrink below their content when told to.
    expect(rule('.tableConfiguration').get('display')).toBe('flex');
    expect(rule('.tableConfiguration').get('flex-direction')).toBe('column');
    expect(rule('.tableConfiguration').get('min-block-size')).toBe('0');
    expect(rule('.content').get('min-block-size')).toBe('0');
    expect(rule('.content').get('flex')).toBe('1 1 auto');
    // The kit's separator bleeds past the list's edges; clipped, it is not a horizontal scroll.
    expect(rule('.content').get('overflow')).toBe('hidden auto');
  });

  it('reads both sizes from a hook an ancestor can set, never declares them on the panel itself', () => {
    // A hook declared on the element that reads it cannot be overridden from above.
    const panel = rule('.tableConfiguration');
    const content = rule('.content');

    expect(panel.get('min-inline-size')).toContain('var(--data-grid-table-configuration-min-inline-size, 304px)');
    expect(content.get('max-block-size')).toBe(
      'var(--data-grid-table-configuration-content-max-block-size, 500px)',
    );
    expect([...panel.keys(), ...content.keys()].filter((name) => name.startsWith('--'))).toEqual([]);
  });

  describe('the pin button', () => {
    const opacity = '--_data-grid-table-configuration-pin-button-opacity';

    it('is hidden at rest, and shown on hover, on keyboard focus and while the column is pinned', () => {
      expect(rule('.configurationItem').get(opacity)).toBe('0');
      expect(rule('.configurationItem:hover').get(opacity)).toBe('1');
      expect(rule('.configurationItem:has(:focus-visible)').get(opacity)).toBe('1');
      // Where `:has` is not supported, the fallback is the whole row holding focus.
      expect(rule('.configurationItem:focus-within').get(opacity)).toBe('1');
      expect(rule('.pinButtonVisible').get(opacity)).toBe('1');
    });

    it('reads that state, and falls back to hidden', () => {
      expect(rule('.pinButton').get('opacity')).toBe(`var(${opacity}, 0)`);
    });
  });

  describe('a highlighted row', () => {
    it('takes the kit\'s menu highlight, the accent fill with its own text colour', () => {
      const hover = rule('.configurationItem:hover');

      expect(hover.get('background-color')).toBe('var(--accent)');
      expect(hover.get('color')).toBe('var(--accent-foreground)');
    });

    it('keeps a switch that is on visible, which in the light theme is the accent fill itself', () => {
      // The ring is in the row's text colour, the one that reads on the fill in both themes.
      expect(rule(".configurationItem:is(:hover, :focus) [role='switch']").get('box-shadow')).toBe(
        '0 0 0 var(--border-width) var(--accent-foreground)',
      );
    });

    it('keeps the pin icon readable: the row\'s text colour, unless the button has its own fill', () => {
      expect(
        rule('.configurationItem:is(:hover, :focus) .pin:not(:hover):not([data-pressed])').get(
          'color',
        ),
      ).toBe('inherit');
    });
  });
});
