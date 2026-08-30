import { pickEpisodeResumeTime } from '../episode-resume';

describe('pickEpisodeResumeTime', () => {
  it('prefers the session map value for the clicked episode', () => {
    expect(
      pickEpisodeResumeTime({
        sessionMap: { 5: 450 },
        record: { index: 1, play_time: 200, episode_times: { 5: 999 } },
        episodeNumber: 4, // 第5集
      }),
    ).toBe(450);
  });

  it('falls back to record.episode_times when session map lacks the episode', () => {
    expect(
      pickEpisodeResumeTime({
        sessionMap: {},
        record: { index: 1, play_time: 200, episode_times: { 5: 300 } },
        episodeNumber: 4,
      }),
    ).toBe(300);
  });

  it('uses legacy play_time only when the record points at the clicked episode', () => {
    // record.index is 1-based; index-1 === episodeNumber means it points here
    expect(
      pickEpisodeResumeTime({
        sessionMap: null,
        record: { index: 3, play_time: 120 },
        episodeNumber: 2,
      }),
    ).toBe(120);
  });

  it('returns 0 for a never-watched episode', () => {
    expect(
      pickEpisodeResumeTime({
        sessionMap: {},
        record: { index: 3, play_time: 120 },
        episodeNumber: 7,
      }),
    ).toBe(0);
  });

  it('treats a 0 (finished) entry as no-resume', () => {
    expect(
      pickEpisodeResumeTime({
        sessionMap: { 5: 0 },
        record: { index: 1, play_time: 200, episode_times: { 5: 0 } },
        episodeNumber: 4,
      }),
    ).toBe(0);
  });

  it('returns 0 when there is no record at all', () => {
    expect(
      pickEpisodeResumeTime({
        sessionMap: undefined,
        record: null,
        episodeNumber: 0,
      }),
    ).toBe(0);
  });
});
