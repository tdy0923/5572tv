import { buildFullscreenTitleHtml } from '../fullscreen-title';

describe('buildFullscreenTitleHtml', () => {
  it('renders title and episode name when there are multiple episodes', () => {
    const html = buildFullscreenTitleHtml({
      title: '庆余年',
      episodeName: '第5集',
      episodeIndex: 4,
      hasEpisodes: true,
    });
    expect(html).toContain('fullscreen-title-text');
    expect(html).toContain('庆余年');
    expect(html).toContain('第5集');
  });

  it('falls back to 第N集 label when no episode title', () => {
    const html = buildFullscreenTitleHtml({
      title: 'X',
      episodeName: '',
      episodeIndex: 2,
      hasEpisodes: true,
    });
    expect(html).toContain('第 3 集');
  });

  it('omits the episode span for single-episode content', () => {
    const html = buildFullscreenTitleHtml({
      title: '电影',
      episodeName: '',
      episodeIndex: 0,
      hasEpisodes: false,
    });
    expect(html).not.toContain('fullscreen-episode-text');
  });

  it('escapes HTML in title and episode name (XSS guard)', () => {
    const html = buildFullscreenTitleHtml({
      title: '<img src=x onerror=alert(1)>',
      episodeName: '<script>bad()</script>',
      episodeIndex: 0,
      hasEpisodes: true,
    });
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>bad');
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
  });
});
