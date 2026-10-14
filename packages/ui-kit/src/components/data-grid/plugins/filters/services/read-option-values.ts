/**
 * The selection a list filter (checkbox group, tag group) holds, read from its state. The state
 * can come back from storage or the address bar, where it is editable, so anything that is not a
 * list reads as no selection: the list would otherwise throw from `includes` while it renders.
 */
export function readOptionValues(value: unknown): (string | number)[] {
  return Array.isArray(value) ? value : [];
}
