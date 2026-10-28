export function buildClonedRowPreview(row: HTMLElement, className: string): HTMLTableElement {
  const table = document.createElement('table');
  const sourceTable = row.closest('table');
  table.className = [sourceTable?.className, className].filter(Boolean).join(' ');
  table.style.width = `${row.getBoundingClientRect().width}px`;

  const tbody = document.createElement('tbody');
  tbody.appendChild(row.cloneNode(true));
  table.appendChild(tbody);

  return table;
}
