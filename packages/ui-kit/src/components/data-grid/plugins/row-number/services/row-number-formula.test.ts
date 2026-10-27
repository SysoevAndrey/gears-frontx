import { describe, expect, it } from 'vitest';
import { computeRowNumber } from './row-number-formula';

describe('computeRowNumber', () => {
  it('returns 1-based index without pagination', () => {
    expect(computeRowNumber(0, 1, 0)).toBe(1);
    expect(computeRowNumber(4, 1, 0)).toBe(5);
    expect(computeRowNumber(9, 1, 0)).toBe(10);
  });

  it('returns 1-based index on first page with pagination', () => {
    expect(computeRowNumber(0, 1, 20)).toBe(1);
    expect(computeRowNumber(4, 1, 20)).toBe(5);
    expect(computeRowNumber(19, 1, 20)).toBe(20);
  });

  it('returns offset number on page 2', () => {
    expect(computeRowNumber(0, 2, 20)).toBe(21);
    expect(computeRowNumber(4, 2, 20)).toBe(25);
    expect(computeRowNumber(19, 2, 20)).toBe(40);
  });

  it('returns offset number on page 3', () => {
    expect(computeRowNumber(0, 3, 20)).toBe(41);
    expect(computeRowNumber(5, 3, 20)).toBe(46);
  });

  it('handles different page sizes', () => {
    expect(computeRowNumber(0, 2, 10)).toBe(11);
    expect(computeRowNumber(0, 2, 50)).toBe(51);
    expect(computeRowNumber(9, 3, 10)).toBe(30);
  });
});
