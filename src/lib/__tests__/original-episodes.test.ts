import { decideOriginalEpisodesUpdate } from '../original-episodes';

describe('decideOriginalEpisodesUpdate', () => {
  it('does not update when the watched episode is within the original baseline', () => {
    const r = decideOriginalEpisodesUpdate({
      originalEpisodes: 8,
      newRecord: { index: 5, play_time: 500, total_episodes: 8 },
      freshTotalEpisodes: 8,
    });
    expect(r.shouldUpdate).toBe(false);
    expect(r.latestTotalEpisodes).toBe(8);
  });

  it('does not update without significant progress even beyond baseline', () => {
    const r = decideOriginalEpisodesUpdate({
      originalEpisodes: 8,
      newRecord: { index: 10, play_time: 30, total_episodes: 12 },
      freshTotalEpisodes: 12,
    });
    expect(r.shouldUpdate).toBe(false);
  });

  it('updates to the max of fresh/original/player totals when beyond baseline with progress', () => {
    const r = decideOriginalEpisodesUpdate({
      originalEpisodes: 8,
      newRecord: { index: 9, play_time: 120, total_episodes: 10 },
      freshTotalEpisodes: 12,
    });
    expect(r.shouldUpdate).toBe(true);
    expect(r.latestTotalEpisodes).toBe(12); // max(12, 8, 10)
  });

  it('boundary: play_time exactly 60 is not significant', () => {
    const r = decideOriginalEpisodesUpdate({
      originalEpisodes: 8,
      newRecord: { index: 9, play_time: 60, total_episodes: 9 },
      freshTotalEpisodes: 9,
    });
    expect(r.shouldUpdate).toBe(false);
  });

  it('boundary: index equal to baseline is not "beyond"', () => {
    const r = decideOriginalEpisodesUpdate({
      originalEpisodes: 8,
      newRecord: { index: 8, play_time: 300, total_episodes: 8 },
      freshTotalEpisodes: 8,
    });
    expect(r.shouldUpdate).toBe(false);
  });
});
