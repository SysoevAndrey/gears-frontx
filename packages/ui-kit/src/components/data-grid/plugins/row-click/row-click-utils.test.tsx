import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { getClickListener } from './row-click-utils';

interface TestItem {
  id: number;
  name: string;
}

const testItem: TestItem = { id: 1, name: 'Test' };

// The listener takes a React event, so the tests give it the one React makes: a row that hands
// what it receives on a click or a key press to the listener, and the DOM it reacts to inside it.
function renderRow(listener: ReturnType<typeof getClickListener<TestItem>>, children: ReactNode) {
  render(
    <table>
      <tbody>
        <tr data-testid="row" onClick={listener} onKeyDown={listener}>
          {children}
        </tr>
      </tbody>
    </table>,
  );
}

describe('getClickListener', () => {
  it('does not call callback when getCb returns undefined', () => {
    const getCb = vi.fn(() => undefined);
    renderRow(getClickListener(testItem, getCb), <td>cell</td>);

    fireEvent.click(screen.getByText('cell'));

    // Asked for the callback and found none: nothing to call, and nothing thrown.
    expect(getCb).toHaveBeenCalledOnce();
  });

  it('calls callback with item on click', () => {
    const cb = vi.fn();
    renderRow(getClickListener(testItem, () => cb), <td>cell</td>);

    fireEvent.click(screen.getByText('cell'));

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(testItem);
  });

  it('reads callback lazily at event time', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const api = { click: cb1 as (item: TestItem) => void };
    renderRow(getClickListener(testItem, () => api.click), <td>cell</td>);

    fireEvent.click(screen.getByText('cell'));
    expect(cb1).toHaveBeenCalledOnce();

    // Swap callback on the mutable API — listener should pick up the new one
    api.click = cb2;
    fireEvent.click(screen.getByText('cell'));
    expect(cb2).toHaveBeenCalledOnce();
    expect(cb1).toHaveBeenCalledOnce(); // cb1 was not called again
  });

  it('suppresses callback when target has ignore attribute', () => {
    const cb = vi.fn();
    renderRow(
      getClickListener(testItem, () => cb),
      <td>
        <button type="button" data-grid-row-ignore-click>
          action
        </button>
      </td>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(cb).not.toHaveBeenCalled();
  });

  it('suppresses callback when target is descendant of ignore element', () => {
    const cb = vi.fn();
    renderRow(
      getClickListener(testItem, () => cb),
      <td>
        <div data-grid-row-ignore-click>
          <span>inside</span>
        </div>
      </td>,
    );

    fireEvent.click(screen.getByText('inside'));

    expect(cb).not.toHaveBeenCalled();
  });

  it('suppresses callback when target is SVG inside ignore element', () => {
    const cb = vi.fn();
    renderRow(
      getClickListener(testItem, () => cb),
      <td>
        <button type="button" data-grid-row-ignore-click>
          <svg data-testid="icon" />
        </button>
      </td>,
    );

    fireEvent.click(screen.getByTestId('icon'));

    expect(cb).not.toHaveBeenCalled();
  });

  it('calls callback on Enter keydown', () => {
    const cb = vi.fn();
    renderRow(getClickListener(testItem, () => cb), <td>cell</td>);

    fireEvent.keyDown(screen.getByTestId('row'), { key: 'Enter' });

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(testItem);
  });

  it('suppresses Enter keydown when target has ignore attribute', () => {
    const cb = vi.fn();
    renderRow(
      getClickListener(testItem, () => cb),
      <td>
        <button type="button" data-grid-row-ignore-click>
          action
        </button>
      </td>,
    );

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });

    expect(cb).not.toHaveBeenCalled();
  });

  it('calls callback when target is not inside ignore element', () => {
    const cb = vi.fn();
    renderRow(
      getClickListener(testItem, () => cb),
      <>
        <td>normal</td>
        <td>
          <button type="button" data-grid-row-ignore-click>
            action
          </button>
        </td>
      </>,
    );

    fireEvent.click(screen.getByText('normal'));

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(testItem);
  });
});
