import {
  clampIndexToRange,
  parseNumericParam,
  resolveIndexForDetail,
} from '../episode-index';

describe('parseNumericParam', () => {
  it('parses valid integers', () => {
    expect(parseNumericParam('5')).toBe(5);
    expect(parseNumericParam('0')).toBe(0);
    expect(parseNumericParam('12')).toBe(12);
  });
  it('defaults to 0 for missing/invalid', () => {
    expect(parseNumericParam(null)).toBe(0);
    expect(parseNumericParam('')).toBe(0);
    expect(parseNumericParam('abc')).toBe(0);
    expect(parseNumericParam('3.9')).toBe(3); // parseInt truncates
  });
});

describe('resolveIndexForDetail (initAll: overflow resets to 0)', () => {
  it('keeps an in-range index', () => {
    expect(resolveIndexForDetail(3, 10)).toBe(3);
    expect(resolveIndexForDetail(0, 10)).toBe(0);
  });
  it('resets to 0 when index is out of range', () => {
    expect(resolveIndexForDetail(10, 10)).toBe(0);
    expect(resolveIndexForDetail(99, 10)).toBe(0);
  });
  it('returns 0 when there are no episodes', () => {
    expect(resolveIndexForDetail(5, 0)).toBe(0);
  });
});

describe('clampIndexToRange (initFromHistory: clamp to [0, total-1])', () => {
  it('clamps high values to the last index', () => {
    expect(clampIndexToRange(50, 10)).toBe(9);
  });
  it('clamps negative values to 0', () => {
    expect(clampIndexToRange(-3, 10)).toBe(0);
  });
  it('keeps in-range values', () => {
    expect(clampIndexToRange(4, 10)).toBe(4);
  });
  it('handles total<=0 safely (single-episode fallback)', () => {
    expect(clampIndexToRange(7, 0)).toBe(0);
  });
});
