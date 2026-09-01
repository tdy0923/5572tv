import { computeProgressPercent } from '../play-progress';

describe('computeProgressPercent', () => {
  it('computes percentage', () => {
    expect(computeProgressPercent({ play_time: 50, total_time: 100 })).toBe(50);
    expect(
      computeProgressPercent({ play_time: 90, total_time: 2700 }),
    ).toBeCloseTo(3.333, 2);
  });

  it('returns 0 when total_time is 0', () => {
    expect(computeProgressPercent({ play_time: 10, total_time: 0 })).toBe(0);
  });

  it('returns 0 for negative/invalid total_time', () => {
    expect(computeProgressPercent({ play_time: 10, total_time: -1 })).toBe(0);
  });

  it('can exceed 100 if play_time > total_time (caller clamps)', () => {
    expect(computeProgressPercent({ play_time: 120, total_time: 100 })).toBe(
      120,
    );
  });
});
