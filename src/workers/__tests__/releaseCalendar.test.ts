import { processReleaseCalendar } from '../releaseCalendar.worker';

type Item = {
  id: string;
  title: string;
  releaseDate: string;
  type: 'movie' | 'tv';
};

const TODAY = '2026-09-29';

function makeItems(): Item[] {
  const items: Item[] = [
    { id: '1', title: '长剧名第二季', releaseDate: '2026-10-01', type: 'tv' },
    { id: '2', title: '长剧名', releaseDate: '2026-10-02', type: 'tv' },
  ];
  for (let i = 0; i < 8; i++) {
    items.push({
      id: `s${i}`,
      title: `连载剧第${i + 3}季`,
      releaseDate: `2026-10-${String(3 + i).padStart(2, '0')}`,
      type: 'tv',
    });
    items.push({
      id: `m${i}`,
      title: `电影${i}`,
      releaseDate: `2026-11-${String(1 + i).padStart(2, '0')}`,
      type: 'movie',
    });
  }
  return items;
}

describe('processReleaseCalendar', () => {
  it('returns identical results across runs', () => {
    const first = processReleaseCalendar({ releases: makeItems(), today: TODAY });
    const second = processReleaseCalendar({ releases: makeItems(), today: TODAY });
    const third = processReleaseCalendar({ releases: makeItems(), today: TODAY });
    expect(second.selectedItems).toEqual(first.selectedItems);
    expect(third.selectedItems).toEqual(first.selectedItems);
    expect(first.selectedItems.length).toBeGreaterThan(0);
  });

  it('prefers titles without season markers', () => {
    const { selectedItems } = processReleaseCalendar({
      releases: makeItems(),
      today: TODAY,
    });
    const titles = selectedItems.map((i) => i.title);
    expect(titles).toContain('长剧名');
    expect(titles).not.toContain('长剧名第二季');
  });
});
