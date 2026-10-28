import { describe, expect, it } from 'vitest';
import { buildClonedRowPreview } from './drag-preview';

function createRow(): HTMLTableRowElement {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  const row = document.createElement('tr');
  row.innerHTML = '<td>Department</td><td>String</td>';
  tbody.appendChild(row);
  table.appendChild(tbody);
  document.body.appendChild(table);
  return row;
}

describe('buildClonedRowPreview', () => {
  it('wraps a clone of the row in a table with the given class', () => {
    const row = createRow();

    const preview = buildClonedRowPreview(row, 'preview-class');

    expect(preview.tagName).toBe('TABLE');
    expect(preview.className).toBe('preview-class');
    const clonedRow = preview.querySelector('tbody > tr');
    expect(clonedRow).not.toBeNull();
    expect(clonedRow?.innerHTML).toBe(row.innerHTML);
  });

  it("carries over the source table's classes so size/border styles match", () => {
    const row = createRow();
    row.closest('table')!.className = 'table sizeM';

    const preview = buildClonedRowPreview(row, 'preview-class');

    expect(preview.classList.contains('table')).toBe(true);
    expect(preview.classList.contains('sizeM')).toBe(true);
    expect(preview.classList.contains('preview-class')).toBe(true);
  });

  it('clones the row rather than moving the original', () => {
    const row = createRow();

    const preview = buildClonedRowPreview(row, 'preview-class');

    // The source row stays in its original table.
    expect(row.isConnected).toBe(true);
    expect(preview.querySelector('tr')).not.toBe(row);
  });

  it('pins the preview width to the source row', () => {
    const row = createRow();
    // jsdom does not lay out elements, so stub the measured width.
    row.getBoundingClientRect = () => new DOMRect(0, 0, 250, 40);

    const preview = buildClonedRowPreview(row, 'preview-class');

    expect(preview.style.width).toBe('250px');
  });
});
