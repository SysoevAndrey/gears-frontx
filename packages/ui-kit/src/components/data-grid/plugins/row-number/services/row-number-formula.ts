export function computeRowNumber(index: number, page: number, limit: number): number {
  return limit * (page - 1) + index + 1;
}
