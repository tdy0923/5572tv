import { generateStorageKey } from '@/lib/utils';

import { parseStorageKey } from '../key-parser';

describe('storage key codec (generateStorageKey / parseStorageKey)', () => {
  it('generates source+id', () => {
    expect(generateStorageKey('zy_06', '79676')).toBe('zy_06+79676');
  });

  it('parses source and id', () => {
    expect(parseStorageKey('zy_06+79676')).toEqual({
      source: 'zy_06',
      id: '79676',
    });
  });

  it('round-trips normal keys', () => {
    const pairs: Array<[string, string]> = [
      ['douban', '34937650'],
      ['emby_home', 'abc'],
      ['shortdrama', '12345'],
    ];
    for (const [source, id] of pairs) {
      expect(parseStorageKey(generateStorageKey(source, id))).toEqual({
        source,
        id,
      });
    }
  });

  it('keeps "+" inside the id intact (splits on first +)', () => {
    expect(parseStorageKey('src+a+b')).toEqual({ source: 'src', id: 'a+b' });
  });

  it('handles a key with no separator', () => {
    expect(parseStorageKey('justid')).toEqual({ source: '', id: 'justid' });
  });

  it('handles empty id', () => {
    expect(parseStorageKey('src+')).toEqual({ source: 'src', id: '' });
  });
});
