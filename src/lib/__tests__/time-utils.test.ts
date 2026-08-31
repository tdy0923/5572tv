import { formatTime, secondsToTime, timeToSeconds } from '../time-utils';

describe('timeToSeconds', () => {
  it('parses mm:ss', () => {
    expect(timeToSeconds('1:30')).toBe(90);
    expect(timeToSeconds('2:05')).toBe(125);
    expect(timeToSeconds('0:00')).toBe(0);
  });
  it('parses bare seconds', () => {
    expect(timeToSeconds('90')).toBe(90);
    expect(timeToSeconds('45.5')).toBe(45.5);
  });
  it('handles empty/invalid as 0', () => {
    expect(timeToSeconds('')).toBe(0);
    expect(timeToSeconds('   ')).toBe(0);
    expect(timeToSeconds('abc')).toBe(0);
    expect(timeToSeconds('1:ab')).toBe(60); // seconds part falls back to 0
  });
});

describe('secondsToTime', () => {
  it('formats whole seconds as m:ss', () => {
    expect(secondsToTime(90)).toBe('1:30');
    expect(secondsToTime(600)).toBe('10:00');
    expect(secondsToTime(0)).toBe('0:00');
    expect(secondsToTime(59)).toBe('0:59');
  });
  it('keeps one decimal when present', () => {
    expect(secondsToTime(65.5)).toBe('1:05.5');
  });
});

describe('formatTime', () => {
  it('formats m:ss with zero-padded seconds', () => {
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(0)).toBe('0:00');
  });
});
