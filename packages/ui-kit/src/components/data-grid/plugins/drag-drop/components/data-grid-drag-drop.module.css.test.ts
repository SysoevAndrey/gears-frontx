import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { declarationMap, extractRules } from '../../../../../__test-utils__/css-rules';

// jsdom has no layout engine and applies no stylesheet, so how a handle takes its room in a row,
// what a row being dragged looks like and how the content wrapper hands down its height are only
// observable in the CSS text.
const here = dirname(fileURLToPath(import.meta.url));
const rules = extractRules(readFileSync(join(here, 'data-grid-drag-drop.module.css'), 'utf-8'));

function declarationsOf(selector: string) {
  const rule = rules.find((candidate) => candidate.selector === selector);
  if (!rule) throw new Error(`No rule for ${selector}`);
  return declarationMap(rule.body);
}

describe('data-grid-drag-drop.module.css', () => {
  describe('the handle', () => {
    it('fills the kit\'s cell and gives its padding back, so a row with a handle is as high as one without', () => {
      const handle = declarationsOf('.dragHandler');
      // The kit's cell is --space-3 of block and --space-4 of inline padding around one line of
      // text, and its height is --control-height-lg.
      expect(handle.get('block-size')).toBe('var(--control-height-lg)');
      expect(handle.get('margin')).toBe('calc(var(--space-3) * -1) calc(var(--space-4) * -1)');
    });

    it('takes its cursor from the consumer\'s hook, and shows progress while a drop is pending', () => {
      expect(declarationsOf('.dragHandler').get('cursor')).toBe('var(--data-grid-drag-cursor, grab)');
      expect(declarationsOf('.dragHandler.dragHandlerLoading').get('cursor')).toBe('progress');
    });

    it('sizes the grip and the spinner alike, at the kit\'s small icon step', () => {
      const icon = declarationsOf('.dragHandler svg');
      expect(icon.get('inline-size')).toBe('var(--icon-size-sm)');
      expect(icon.get('block-size')).toBe('var(--icon-size-sm)');
    });
  });

  describe('a row being dragged', () => {
    it('is tinted --secondary on the row and on its pinned cells, and grabs', () => {
      const dragging = declarationsOf('.dragRow.dragRowDragging');
      expect(dragging.get('background-color')).toBe('var(--secondary)');
      // A pinned cell paints this base under the row's fill, so it would stay untinted without it.
      expect(dragging.get('--table-pinned-fill')).toBe('var(--secondary)');
      expect(dragging.get('--data-grid-drag-cursor')).toBe('grabbing');
      expect(dragging.get('cursor')).toBe('grabbing');
    });

    it('takes no pointer events, so the row under it is what a drop lands on', () => {
      expect(declarationsOf('.dragRow.dragRowDragging').get('pointer-events')).toBe('none');
    });

    it('rounds its two ends, in either writing direction', () => {
      const start = declarationsOf('.dragRow.dragRowDragging > td:first-child');
      expect(start.get('border-start-start-radius')).toBe('var(--radius-md)');
      expect(start.get('border-end-start-radius')).toBe('var(--radius-md)');
      const end = declarationsOf('.dragRow.dragRowDragging > td:last-child');
      expect(end.get('border-start-end-radius')).toBe('var(--radius-md)');
      expect(end.get('border-end-end-radius')).toBe('var(--radius-md)');
    });
  });

  describe('a row being dropped on', () => {
    it('takes the kit\'s hover tint on the row and on its pinned cells', () => {
      const dropping = declarationsOf('.dragRow.dragRowDropping');
      expect(dropping.get('background-color')).toBe('var(--card-hover)');
      expect(dropping.get('--table-pinned-fill')).toBe('var(--card-hover)');
    });

    it('draws the line on the edge the drop would land beside, in --primary', () => {
      expect(declarationsOf('.dragRow.dragRowDropIndicatorTop > td').get('box-shadow')).toBe(
        'inset 0 2px 0 0 var(--primary)',
      );
      expect(declarationsOf('.dragRow.dragRowDropIndicatorBottom > td').get('box-shadow')).toBe(
        'inset 0 -2px 0 0 var(--primary)',
      );
    });
  });

  it('hands the grid\'s height down through the content wrapper without growing it', () => {
    const content = declarationsOf('.content');
    expect(content.get('display')).toBe('flex');
    expect(content.get('flex-direction')).toBe('column');
    // What lets a bounded grid shrink this element to its frame.
    expect(content.get('min-block-size')).toBe('0');
    // Not a `flex` shorthand: an unbounded grid has to stay as tall as its rows.
    expect(content.has('flex')).toBe(false);
  });

  it('turns the rows\' hover tint off while a row is dragged, with the kit\'s hook', () => {
    expect(declarationsOf('.contentDragging').get('--table-row-hover-fill')).toBe('transparent');
  });

  it('outlines the whole grid while it is the drop target', () => {
    const root = declarationsOf('.contentRootDropping');
    expect(root.get('outline')).toBe('2px dashed var(--primary)');
    expect(root.get('background-color')).toBe('var(--secondary)');
  });

  it('draws the preview as a rounded, lifted surface', () => {
    const preview = declarationsOf('.dragPreview');
    expect(preview.get('border-radius')).toBe('var(--radius-md)');
    expect(preview.get('background-color')).toBe('var(--surface)');
    expect(preview.get('box-shadow')).toBe('var(--popover-shadow)');
    // `border-radius` clips only a table that does not collapse its borders.
    expect(preview.get('border-collapse')).toBe('separate');
  });
});
