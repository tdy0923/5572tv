import { formatEpisodeLabel } from '../episode-label';

describe('formatEpisodeLabel', () => {
  it('extracts the number from 第N集/话/部/期 forms', () => {
    expect(formatEpisodeLabel('第5集', 5)).toBe('5');
    expect(formatEpisodeLabel('第03话', 3)).toBe('03');
    expect(formatEpisodeLabel('第12期', 12)).toBe('12');
    expect(formatEpisodeLabel('第1部', 1)).toBe('1');
  });

  it('extracts number even without the 第 prefix', () => {
    expect(formatEpisodeLabel('5集', 5)).toBe('5');
    expect(formatEpisodeLabel('HD 8话', 8)).toBe('8');
  });

  it('returns the raw title when there is no numbered 集/话/部/期 token', () => {
    expect(formatEpisodeLabel('正片', 1)).toBe('正片');
    expect(formatEpisodeLabel('BD1024分钟', 1)).toBe('BD1024分钟');
  });

  it('falls back to the episode number when title is missing/empty', () => {
    expect(formatEpisodeLabel(undefined, 7)).toBe(7);
    expect(formatEpisodeLabel('', 7)).toBe(7);
  });
});
