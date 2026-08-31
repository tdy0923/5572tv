import {
  getSourceIdentityKey,
  isShortDramaSource,
  parseSourceForApi,
} from '../source-identity';

describe('source-identity', () => {
  describe('getSourceIdentityKey', () => {
    it('joins source and id with ::', () => {
      expect(getSourceIdentityKey('zy_06', '79676')).toBe('zy_06::79676');
    });
    it('is stable and distinct per source/id pair', () => {
      expect(getSourceIdentityKey('a', '1')).not.toBe(
        getSourceIdentityKey('a', '2'),
      );
      expect(getSourceIdentityKey('a', '1')).not.toBe(
        getSourceIdentityKey('b', '1'),
      );
    });
  });

  describe('parseSourceForApi', () => {
    it('splits emby_<key> into emby + embyKey', () => {
      expect(parseSourceForApi('emby_home')).toEqual({
        source: 'emby',
        embyKey: 'home',
      });
    });
    it('handles emby_ with empty key', () => {
      expect(parseSourceForApi('emby_')).toEqual({
        source: 'emby',
        embyKey: '',
      });
    });
    it('leaves plain emby as-is (no key)', () => {
      expect(parseSourceForApi('emby')).toEqual({ source: 'emby' });
    });
    it('leaves non-emby sources untouched', () => {
      expect(parseSourceForApi('zy_06')).toEqual({ source: 'zy_06' });
    });
  });

  describe('isShortDramaSource', () => {
    it('recognizes shortdrama variants', () => {
      expect(isShortDramaSource('shortdrama')).toBe(true);
      expect(isShortDramaSource('shortdrama_x')).toBe(true);
      expect(isShortDramaSource('短剧')).toBe(true);
    });
    it('rejects unrelated sources', () => {
      expect(isShortDramaSource('zy_06')).toBe(false);
      expect(isShortDramaSource('emby')).toBe(false);
      expect(isShortDramaSource('')).toBe(false);
    });
  });
});
