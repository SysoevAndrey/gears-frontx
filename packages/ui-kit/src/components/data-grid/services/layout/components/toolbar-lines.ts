/*
 * Whether a toolbar is on one line. The toolbar wraps on a narrow screen, at three levels (its two
 * halves, what the start half holds, what a plugin's own bar holds), and every level is a flex
 * container that wraps. So it is on one line when, in every such container, the items sit on one
 * line: all of them share some horizontal line. Items of different heights that are centred on a
 * line still do, and items on two lines do not, because the first line's bottoms are above the
 * second's tops. Only the vertical position is read, so the writing direction does not matter.
 */

// An item that is not in the flow takes no line, and a wrapper with `display: contents` has no box
// of its own: its children are the container's items.
function flowItems(container: Element): Element[] {
  const items: Element[] = [];

  for (const child of Array.from(container.children)) {
    const { display, position } = getComputedStyle(child);
    if (display === 'none' || position === 'absolute' || position === 'fixed') continue;

    if (display === 'contents') {
      items.push(...flowItems(child));
    } else {
      items.push(child);
    }
  }

  return items;
}

function wraps(element: Element): boolean {
  const { display, flexWrap } = getComputedStyle(element);
  return display.includes('flex') && flexWrap !== '' && flexWrap !== 'nowrap';
}

function itemsShareALine(container: Element): boolean {
  let lowestTop = Number.NEGATIVE_INFINITY;
  let highestBottom = Number.POSITIVE_INFINITY;

  for (const item of flowItems(container)) {
    const { top, bottom, width, height } = item.getBoundingClientRect();
    if (width === 0 && height === 0) continue;
    lowestTop = Math.max(lowestTop, top);
    highestBottom = Math.min(highestBottom, bottom);
  }

  // Half a pixel of slack for the rounding a layout engine does between lines that touch.
  return lowestTop <= highestBottom + 0.5;
}

export function isOnOneLine(root: Element): boolean {
  return [root, ...Array.from(root.querySelectorAll('*'))].every(
    (element) => !wraps(element) || itemsShareALine(element),
  );
}
