/**
 * @jest-environment node
 */
import { getContentId } from '../route';

describe('poster-cache getContentId', () => {
  it('includes the douban size variant so landscape and portrait do not collide', () => {
    const landscape =
      'https://img9.doubanio.com/view/photo/l/public/p2934541050.jpg';
    const portrait =
      'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p2934541050.jpg';

    const idL = getContentId(landscape);
    const idP = getContentId(portrait);

    expect(idL).toBe('p2934541050_l');
    expect(idP).toBe('p2934541050_s_ratio_poster');
    // Regression guard: same pNNN but different variant must NOT share a key
    expect(idL).not.toBe(idP);
  });

  it('distinguishes m_ratio_poster from s_ratio_poster for the same id', () => {
    const s = getContentId(
      'https://img1.doubanio.com/view/photo/s_ratio_poster/public/p123.jpg',
    );
    const m = getContentId(
      'https://img1.doubanio.com/view/photo/m_ratio_poster/public/p123.jpg',
    );
    expect(s).not.toBe(m);
  });

  it('extracts the file stem for manmankan urls', () => {
    expect(
      getContentId(
        'https://moviepic.manmankan.com/yybpic/202401/35434/35434.png',
      ),
    ).toBe('35434');
  });

  it('falls back to a hash for unrecognized urls', () => {
    const id = getContentId('https://example.com/some/weird/path');
    expect(id.startsWith('hash_')).toBe(true);
  });
});
