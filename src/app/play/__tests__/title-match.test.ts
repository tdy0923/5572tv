import {
  isEnglishQuery,
  matchesEnglishQuery,
  matchesYearAndType,
  normalizeForMatch,
} from '../title-match';

describe('normalizeForMatch', () => {
  it('lowercases and strips punctuation/whitespace', () => {
    expect(normalizeForMatch('  庆余年 第二季! ')).toBe('庆余年第二季');
    expect(normalizeForMatch('A-B_C')).toBe('ab_c'); // 下划线属 \w，保留；连字符去除
  });

  it('is case-insensitive (fixes query/title asymmetry)', () => {
    expect(normalizeForMatch('Friends')).toBe(normalizeForMatch('friends'));
    expect(normalizeForMatch('BBC 地球脉动')).toBe(
      normalizeForMatch('bbc地球脉动'),
    );
  });

  it('keeps CJK and digits', () => {
    expect(normalizeForMatch('第2季')).toBe('第2季');
  });

  it('handles empty/nullish', () => {
    expect(normalizeForMatch('')).toBe('');
    expect(normalizeForMatch(undefined as unknown as string)).toBe('');
  });
});

describe('matchesYearAndType', () => {
  it('passes year when no expected year', () => {
    expect(
      matchesYearAndType({
        year: '2020',
        episodeCount: 5,
        expectedYear: '',
        searchType: '',
      }),
    ).toBe(true);
  });

  it('requires year to match when expected', () => {
    expect(
      matchesYearAndType({
        year: '2024',
        episodeCount: 5,
        expectedYear: '2024',
        searchType: '',
      }),
    ).toBe(true);
    expect(
      matchesYearAndType({
        year: '2019',
        episodeCount: 5,
        expectedYear: '2024',
        searchType: '',
      }),
    ).toBe(false);
  });

  it('tv requires multiple episodes, movie requires exactly one', () => {
    expect(
      matchesYearAndType({
        year: '',
        episodeCount: 3,
        expectedYear: '',
        searchType: 'tv',
      }),
    ).toBe(true);
    expect(
      matchesYearAndType({
        year: '',
        episodeCount: 1,
        expectedYear: '',
        searchType: 'tv',
      }),
    ).toBe(false);
    expect(
      matchesYearAndType({
        year: '',
        episodeCount: 1,
        expectedYear: '',
        searchType: 'movie',
      }),
    ).toBe(true);
    expect(
      matchesYearAndType({
        year: '',
        episodeCount: 2,
        expectedYear: '',
        searchType: 'movie',
      }),
    ).toBe(false);
  });
});

describe('isEnglishQuery', () => {
  it('detects latin-dominant queries', () => {
    expect(isEnglishQuery('Breaking Bad')).toBe(true);
    expect(isEnglishQuery('庆余年')).toBe(false);
    expect(isEnglishQuery('the matrix')).toBe(true);
  });
});

describe('matchesEnglishQuery', () => {
  it('matches when most query words appear in the title', () => {
    expect(matchesEnglishQuery('breaking bad', 'Breaking Bad Season 1')).toBe(
      true,
    );
  });
  it('ignores stopwords', () => {
    expect(matchesEnglishQuery('the the the', 'anything')).toBe(false); // all stopwords -> no query words
  });
  it('rejects unrelated titles', () => {
    expect(matchesEnglishQuery('friends', 'breaking bad')).toBe(false);
  });
  it('matches via 4-char prefix similarity', () => {
    expect(matchesEnglishQuery('stranger', 'strangers things')).toBe(true);
  });
});
