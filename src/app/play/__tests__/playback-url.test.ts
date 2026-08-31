import { buildEpisodePlaybackUrl } from '../playback-url';

describe('buildEpisodePlaybackUrl', () => {
  const HOST = 'www.5572.net';

  it('wraps a remote .m3u8 through the m3u8 proxy with the source header', () => {
    const out = buildEpisodePlaybackUrl({
      episodeData: 'https://cdn.example.com/ep1/index.m3u8',
      source: 'zy_06',
      audioTrackIndex: -1,
      host: HOST,
    });
    expect(out).toBe(
      `/api/proxy/m3u8?url=${encodeURIComponent('https://cdn.example.com/ep1/index.m3u8')}&5572tv-source=${encodeURIComponent('zy_06')}`,
    );
  });

  it('wraps a remote .m3u8 without source header when source is empty', () => {
    const out = buildEpisodePlaybackUrl({
      episodeData: 'https://cdn.example.com/ep1/index.m3u8',
      source: '',
      audioTrackIndex: -1,
      host: HOST,
    });
    expect(out).toBe(
      `/api/proxy/m3u8?url=${encodeURIComponent('https://cdn.example.com/ep1/index.m3u8')}`,
    );
    expect(out).not.toContain('5572tv-source');
  });

  it('does NOT re-wrap an already-proxied (same-host) url', () => {
    const already = `/api/proxy/m3u8?url=${encodeURIComponent('https://x/y.m3u8')}`;
    const out = buildEpisodePlaybackUrl({
      episodeData: `https://${HOST}${already}`,
      source: 'zy_06',
      audioTrackIndex: -1,
      host: HOST,
    });
    // contains host -> left as-is
    expect(out).toContain(`https://${HOST}/api/proxy/m3u8`);
  });

  it('leaves non-m3u8 urls untouched (no proxy wrap)', () => {
    const out = buildEpisodePlaybackUrl({
      episodeData: 'https://cdn.example.com/movie.mp4',
      source: 'zy_06',
      audioTrackIndex: -1,
      host: HOST,
    });
    expect(out).toBe('https://cdn.example.com/movie.mp4');
  });

  it('appends AudioStreamIndex for emby sources and skips proxy wrap', () => {
    const out = buildEpisodePlaybackUrl({
      episodeData: 'https://emby.example.com/videos/123/master.m3u8',
      source: 'emby_home',
      audioTrackIndex: 2,
      host: HOST,
    });
    expect(out).toContain('AudioStreamIndex=2');
    // emby must NOT be wrapped in /api/proxy/m3u8
    expect(out.startsWith('/api/proxy/m3u8')).toBe(false);
  });

  it('does not append audio index for emby when none selected (-1)', () => {
    const out = buildEpisodePlaybackUrl({
      episodeData: 'https://emby.example.com/videos/123/master.m3u8',
      source: 'emby',
      audioTrackIndex: -1,
      host: HOST,
    });
    expect(out).not.toContain('AudioStreamIndex');
  });

  it('returns empty string for empty episode data', () => {
    expect(
      buildEpisodePlaybackUrl({
        episodeData: '',
        source: 'zy_06',
        audioTrackIndex: -1,
        host: HOST,
      }),
    ).toBe('');
  });
});
