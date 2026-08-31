import { buildDefaultSkipSegments } from '../skip-segments';

const base = {
  openingStart: '0:00',
  openingEnd: '1:30', // 90s
  endingStart: '2:00', // 120s
  endingMode: 'remaining',
  autoSkip: true,
  autoNextEpisode: true,
};

describe('buildDefaultSkipSegments', () => {
  it('adds opening + ending for a normal-length video', () => {
    const segs = buildDefaultSkipSegments({ duration: 2700, settings: base });
    const opening = segs.find((s) => s.type === 'opening');
    const ending = segs.find((s) => s.type === 'ending');
    expect(opening).toBeDefined();
    expect(opening?.start).toBe(0);
    expect(opening?.end).toBe(90); // min(90, 2700*0.4)
    // remaining 120s on a 2700s video -> start 2580, ratio ~0.956 > 0.6
    expect(ending).toBeDefined();
    expect(ending?.start).toBeCloseTo(2580);
    expect(ending?.end).toBe(2700);
    expect(ending?.autoNextEpisode).toBe(true);
  });

  it('skips opening detection for short videos', () => {
    // 200s video, opening end 90s > 30% (60s) -> not enabled
    const segs = buildDefaultSkipSegments({ duration: 200, settings: base });
    expect(segs.find((s) => s.type === 'opening')).toBeUndefined();
  });

  it('keeps opening for short video when opening is small enough', () => {
    const segs = buildDefaultSkipSegments({
      duration: 200,
      settings: { ...base, openingEnd: '0:30' }, // 30s < 60s(30%)
    });
    expect(segs.find((s) => s.type === 'opening')).toBeDefined();
  });

  it('caps opening end at 40% of duration', () => {
    const segs = buildDefaultSkipSegments({
      duration: 200,
      settings: { ...base, openingEnd: '0:50' }, // 50s < 60s so enabled; cap 200*0.4=80 -> stays 50
    });
    const opening = segs.find((s) => s.type === 'opening');
    expect(opening?.end).toBeLessThanOrEqual(200 * 0.4);
  });

  it('skips ending when its start is too early (ratio <= 0.6)', () => {
    // absolute mode, endingStart at 100s on a 200s video -> ratio 0.5 -> not enabled
    const segs = buildDefaultSkipSegments({
      duration: 200,
      settings: { ...base, endingMode: 'absolute', endingStart: '1:40' },
    });
    expect(segs.find((s) => s.type === 'ending')).toBeUndefined();
  });

  it('never adds an ending segment when duration is 0', () => {
    const segs = buildDefaultSkipSegments({ duration: 0, settings: base });
    expect(segs.find((s) => s.type === 'ending')).toBeUndefined();
  });
});
