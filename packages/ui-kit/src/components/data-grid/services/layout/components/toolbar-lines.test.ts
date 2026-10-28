import { afterEach, describe, expect, it, vi } from 'vitest';

import { isOnOneLine } from './toolbar-lines';

// jsdom lays nothing out, so the boxes are given: each element reports the vertical range it is
// told to, and its `display`, `flex-wrap` and `position` are inline styles, which is what the
// toolbar's stylesheets set on the real thing.
const rects = new Map<Element, { top: number; bottom: number; width?: number }>();

vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
  const rect = rects.get(this) ?? { top: 0, bottom: 0, width: 0 };
  const { top, bottom, width = 40 } = rect;
  return new DOMRect(0, top, width, bottom - top);
});

afterEach(() => {
  rects.clear();
  document.body.replaceChildren();
});

interface Box {
  style?: Partial<CSSStyleDeclaration>;
  top?: number;
  bottom?: number;
  width?: number;
  children?: Element[];
}

function box({ style = {}, top, bottom, width, children = [] }: Box = {}) {
  const element = document.createElement('div');
  Object.assign(element.style, style);
  if (top !== undefined && bottom !== undefined) rects.set(element, { top, bottom, width });
  element.append(...children);
  return element;
}

const wrapping = { display: 'flex', flexWrap: 'wrap' };

// A line of three items at the given vertical ranges.
function row(...ranges: [number, number][]) {
  return ranges.map(([top, bottom]) => box({ top, bottom }));
}

describe('isOnOneLine', () => {
  it('is on one line when the items share a line, whatever their heights', () => {
    // A search field and a smaller button, both centred on the same line.
    const toolbar = box({ style: wrapping, children: row([0, 40], [4, 36], [4, 36]) });
    document.body.append(toolbar);

    expect(isOnOneLine(toolbar)).toBe(true);
  });

  it('is not on one line when an item is on a line of its own below the others', () => {
    // The end half has gone on to a second line.
    const toolbar = box({ style: wrapping, children: row([0, 40], [48, 80]) });
    document.body.append(toolbar);

    expect(isOnOneLine(toolbar)).toBe(false);
  });

  it('reads the items of a wrapper that has no box of its own as the container\'s own', () => {
    const chips = (ranges: [number, number][]) =>
      box({ style: { display: 'contents' }, children: row(...ranges) });
    const together = box({ style: wrapping, children: [chips([[0, 32], [0, 32]])] });
    const apart = box({ style: wrapping, children: [chips([[0, 32], [40, 72]])] });
    document.body.append(together, apart);

    expect(isOnOneLine(together)).toBe(true);
    expect(isOnOneLine(apart)).toBe(false);
  });

  it('looks inside the halves: a bar that wraps on its own makes the toolbar more than one line', () => {
    // The two halves share a line, but what the start half holds has gone on to a second line.
    const start = box({ style: wrapping, top: 0, bottom: 80, children: row([0, 32], [40, 72]) });
    const end = box({ top: 24, bottom: 56 });
    const toolbar = box({ style: wrapping, top: 0, bottom: 80, children: [start, end] });
    document.body.append(toolbar);

    expect(isOnOneLine(toolbar)).toBe(false);
  });

  it('does not count an item that is out of the flow, or one that takes no room', () => {
    const hidden = box({ style: { position: 'absolute' }, top: 200, bottom: 201 });
    const empty = box({ top: 90, bottom: 90, width: 0 });
    const gone = box({ style: { display: 'none' }, top: 300, bottom: 340 });
    const toolbar = box({
      style: wrapping,
      children: [...row([0, 40], [4, 36]), hidden, empty, gone],
    });
    document.body.append(toolbar);

    expect(isOnOneLine(toolbar)).toBe(true);
  });

  it('leaves alone a container that does not wrap, whose items may stack', () => {
    const stacked = box({ children: row([0, 20], [20, 40]) });
    const toolbar = box({ style: wrapping, children: [stacked, ...row([0, 40])] });
    document.body.append(toolbar);

    expect(isOnOneLine(toolbar)).toBe(true);
  });

  it('answers the same in a right-to-left toolbar, since only the vertical position counts', () => {
    const oneLine = box({ style: wrapping, children: row([0, 40], [4, 36]) });
    const wrapped = box({ style: wrapping, children: row([0, 40], [48, 80]) });
    for (const toolbar of [oneLine, wrapped]) {
      toolbar.dir = 'rtl';
      document.body.append(toolbar);
    }

    expect(isOnOneLine(oneLine)).toBe(true);
    expect(isOnOneLine(wrapped)).toBe(false);
  });
});
