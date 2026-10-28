import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { render } from '../../../../../__test-utils__/render-with-user';
import { DataGrid } from '../../../data-grid';
import type { DataGridLoadResult } from '../../../data-grid-types';
import { useDataGridPluginContext } from '../../core/data-grid-context';
import { createDataGridPlugin } from '../../plugins/plugins-helpers';
import type { DataGridTableColumn } from '../../table/table-types';

interface Item {
  id: number;
  name: string;
}

const columns: DataGridTableColumn<Item>[] = [{ id: 'name', label: 'Name' }];

function load(): Promise<DataGridLoadResult<Item>> {
  return Promise.resolve({ results: [{ id: 1, name: 'Item A' }], total: 1 });
}

// A toolbar (a `top-end` slot gives the grid its default one) and a slot that can take its place.
const ToolbarPlugin = createDataGridPlugin('toolbar_test', (context) => {
  context.registerSlot('top-start', { id: 'find', component: () => <input aria-label="Find" /> });
  context.registerSlot('top-end', { id: 'add', component: () => <button type="button">Add</button> });
  context.registerSlot('top', { id: 'bar', component: () => <div>Bar</div> });
  return {};
});

function SwapButton() {
  const context = useDataGridPluginContext();
  return (
    <>
      <button type="button" onClick={() => context.setActiveSlotId('top', 'bar')}>
        show bar
      </button>
      <button type="button" onClick={() => context.setActiveSlotId('top', 'default')}>
        show toolbar
      </button>
    </>
  );
}

interface Observation {
  callback: ResizeObserverCallback;
  targets: Element[];
}

const observations: Observation[] = [];

function stubResizeObserver() {
  observations.length = 0;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private observation: Observation;
      constructor(callback: ResizeObserverCallback) {
        this.observation = { callback, targets: [] };
        observations.push(this.observation);
      }
      observe(target: Element) {
        this.observation.targets.push(target);
      }
      unobserve() {}
      disconnect() {
        this.observation.targets = [];
      }
    },
  );
}

// The element the toolbar sits in that something observes: the wrapper the layout measures.
function toolbarWrapper() {
  let element = screen.getByRole('button', { name: 'Add' }).parentElement;
  while (element) {
    const observed = element;
    if (observations.some((candidate) => candidate.targets.includes(observed))) return observed;
    element = element.parentElement;
  }
  throw new Error('nothing observes the toolbar');
}

// What the observer watching the toolbar's wrapper reports: the box is `blockSize` tall.
function measureToolbar(blockSize: number) {
  const wrapper = toolbarWrapper();
  const observation = observations.find((candidate) => candidate.targets.includes(wrapper));
  if (!observation) throw new Error('nothing observes the toolbar wrapper');
  act(() => {
    observation.callback(
      [
        {
          target: wrapper,
          contentRect: new DOMRect(0, 0, 0, 0),
          borderBoxSize: [{ blockSize, inlineSize: 0 }],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        },
      ],
      new ResizeObserver(() => undefined),
    );
  });
}

describe('DataGridLayoutTop -- a slot that replaces the toolbar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('is given at least the room the toolbar took, so what is under it does not move', async () => {
    stubResizeObserver();
    const { user } = render(
      <DataGrid name="layout_top_swap" persistent="memory" load={load} columns={columns}>
        <ToolbarPlugin />
        <SwapButton />
      </DataGrid>,
    );
    await screen.findByText('Item A');
    measureToolbar(48);

    await user.click(screen.getByRole('button', { name: 'show bar' }));

    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    expect(screen.getByText('Bar').parentElement?.style.getPropertyValue('min-block-size')).toBe(
      '48px',
    );
  });

  it('follows the toolbar while it is on screen, and puts no minimum on the toolbar itself', async () => {
    stubResizeObserver();
    const { user } = render(
      <DataGrid name="layout_top_follow" persistent="memory" load={load} columns={columns}>
        <ToolbarPlugin />
        <SwapButton />
      </DataGrid>,
    );
    await screen.findByText('Item A');
    measureToolbar(40);
    measureToolbar(56);

    expect(toolbarWrapper().style.getPropertyValue('min-block-size')).toBe('');

    await user.click(screen.getByRole('button', { name: 'show bar' }));
    expect(screen.getByText('Bar').parentElement?.style.getPropertyValue('min-block-size')).toBe(
      '56px',
    );

    // Back to the toolbar: no minimum on it, whatever the bar was given.
    await user.click(screen.getByRole('button', { name: 'show toolbar' }));
    expect(toolbarWrapper().style.getPropertyValue('min-block-size')).toBe('');
  });

  it('is given no minimum before the toolbar has been measured', async () => {
    stubResizeObserver();
    const { user } = render(
      <DataGrid name="layout_top_none" persistent="memory" load={load} columns={columns}>
        <ToolbarPlugin />
        <SwapButton />
      </DataGrid>,
    );
    await screen.findByText('Item A');

    await user.click(screen.getByRole('button', { name: 'show bar' }));

    expect(screen.getByText('Bar').parentElement?.style.getPropertyValue('min-block-size')).toBe('');
  });

  // jsdom lays nothing out and applies no stylesheet, so a toolbar that has wrapped is made by
  // hand: the toolbar is a wrapping flex container, and its two halves report where they sit.
  function layOutToolbar(startRange: [number, number], endRange: [number, number]) {
    const wrapper = toolbarWrapper();
    const toolbar = wrapper.firstElementChild as HTMLElement;
    toolbar.style.display = 'flex';
    toolbar.style.flexWrap = 'wrap';
    const [start, end] = Array.from(toolbar.children);
    const ranges = new Map<Element, [number, number]>([
      [start, startRange],
      [end, endRange],
    ]);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const [top, bottom] = ranges.get(this) ?? [0, 0];
      return new DOMRect(0, top, 100, bottom - top);
    });
  }

  it('keeps no minimum for a toolbar that has wrapped onto two lines, and the room of one that fits', async () => {
    stubResizeObserver();
    const { user } = render(
      <DataGrid name="layout_top_wrapped" persistent="memory" load={load} columns={columns}>
        <ToolbarPlugin />
        <SwapButton />
      </DataGrid>,
    );
    await screen.findByText('Item A');

    // The end half is on a line of its own under the start half: 40 and 8 apart, 88 in all.
    layOutToolbar([0, 40], [48, 80]);
    measureToolbar(88);
    await user.click(screen.getByRole('button', { name: 'show bar' }));
    expect(screen.getByText('Bar').parentElement?.style.getPropertyValue('min-block-size')).toBe('');

    // Widened to one line, with the two halves centred on it: the bar keeps that room again.
    await user.click(screen.getByRole('button', { name: 'show toolbar' }));
    layOutToolbar([0, 40], [4, 36]);
    measureToolbar(48);
    await user.click(screen.getByRole('button', { name: 'show bar' }));
    expect(screen.getByText('Bar').parentElement?.style.getPropertyValue('min-block-size')).toBe(
      '48px',
    );
  });
});
