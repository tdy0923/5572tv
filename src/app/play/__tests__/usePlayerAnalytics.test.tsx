import { act, renderHook } from '@testing-library/react';

import { usePlayerAnalytics } from '../hooks/usePlayerAnalytics';

type Handler = (...args: any[]) => void;

function createPlayer() {
  const handlers: Record<string, Handler[]> = {};
  const player = {
    on: (event: string, fn: Handler) => {
      (handlers[event] ||= []).push(fn);
    },
    off: (event: string, fn: Handler) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== fn);
    },
    emit: (event: string, ...args: any[]) => {
      (handlers[event] || []).forEach((h) => h(...args));
    },
  };
  return { player, emit: player.emit };
}

type PlayerContext = {
  videoId?: string;
  title?: string;
  source?: string;
};

const fetchMock = jest.fn();

function setup(
  episodeIndex = 0,
  source = 'sourceA',
  getContext?: () => PlayerContext,
  bindLate = false,
) {
  const artPlayerRef = { current: null as any };
  const currentSourceRef = { current: source };
  const currentEpisodeIndexRef = { current: episodeIndex };
  const { player, emit } = createPlayer();
  if (!bindLate) artPlayerRef.current = player;
  const utils = renderHook(() =>
    usePlayerAnalytics(
      artPlayerRef,
      currentSourceRef,
      currentEpisodeIndexRef,
      getContext,
    ),
  );
  return {
    ...utils,
    emit,
    player,
    artPlayerRef,
    currentSourceRef,
    currentEpisodeIndexRef,
  };
}

function lastReportBody() {
  const calls = fetchMock.mock.calls;
  return JSON.parse(calls[calls.length - 1][1].body as string) as Record<
    string,
    unknown
  >;
}

describe('usePlayerAnalytics', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = realFetch;
  });

  it('records a single tick of play time per interval while playing', () => {
    const { result, emit } = setup();
    act(() => {
      emit('play');
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.getStats().totalPlayTime).toBe(2000);
  });

  it('counts each millisecond once when pause fires after an interval tick', () => {
    const { result, emit } = setup();
    act(() => {
      emit('play');
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.getStats().totalPlayTime).toBe(1000);
    act(() => {
      jest.advanceTimersByTime(600);
      emit('pause');
    });
    expect(result.current.getStats().totalPlayTime).toBe(1600);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.getStats().totalPlayTime).toBe(1600);
    expect(result.current.getStats().pauseCount).toBe(1);
  });

  it('includes in-flight play time in getStats', () => {
    const { result, emit } = setup();
    act(() => {
      emit('play');
    });
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    const stats = result.current.getStats();
    expect(stats.totalPlayTime).toBe(2500);
    expect(result.current.getStats().totalPlayTime).toBe(2500);
    act(() => {
      jest.advanceTimersByTime(250);
      emit('pause');
    });
    expect(result.current.getStats().totalPlayTime).toBe(2750);
  });

  it('does not lose time across play events repeated every 500ms', () => {
    const { result, emit } = setup();
    act(() => {
      emit('play');
    });
    for (let elapsed = 500; elapsed <= 1500; elapsed += 500) {
      act(() => {
        jest.advanceTimersByTime(500);
        emit('play');
      });
      expect(result.current.getStats().totalPlayTime).toBe(elapsed);
    }
    act(() => {
      jest.advanceTimersByTime(250);
      emit('pause');
    });
    expect(result.current.getStats().totalPlayTime).toBe(1750);
  });

  it('reset clears baselines and stops timing until the next play event', () => {
    const { result, emit, currentSourceRef, currentEpisodeIndexRef } = setup();
    act(() => {
      emit('play');
      jest.advanceTimersByTime(2500);
      emit('error', 'failure');
      currentSourceRef.current = 'sourceB';
      currentEpisodeIndexRef.current = 3;
      result.current.reset();
    });
    const emptyStats = {
      totalPlayTime: 0,
      pauseCount: 0,
      errorCount: 0,
      sourceSwitchCount: 0,
      episodeChangeCount: 0,
      events: [],
    };
    expect(result.current.getStats()).toEqual(emptyStats);
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(result.current.getStats()).toEqual(emptyStats);
    act(() => {
      emit('pause');
      emit('video:ended');
    });
    expect(result.current.getStats().totalPlayTime).toBe(0);
    act(() => {
      emit('play');
      currentSourceRef.current = 'sourceC';
      currentEpisodeIndexRef.current = 4;
      jest.advanceTimersByTime(1250);
    });
    expect(result.current.getStats()).toMatchObject({
      totalPlayTime: 1250,
      sourceSwitchCount: 1,
      episodeChangeCount: 1,
      pauseCount: 1,
      errorCount: 0,
    });
  });

  it.each([0, 5])('uses initial episode %i without a fake change', (index) => {
    const { result, currentEpisodeIndexRef } = setup(index);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.getStats().episodeChangeCount).toBe(0);
    expect(result.current.getStats().events).toEqual([]);
    act(() => {
      currentEpisodeIndexRef.current = index + 1;
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.getStats().episodeChangeCount).toBe(1);
    expect(result.current.getStats().events).toEqual([
      expect.objectContaining({
        type: 'episodeChange',
        detail: String(index + 1),
      }),
    ]);
  });

  it.each(['sourceA', ''])('uses initial source %s without a fake change', (source) => {
    const { result, currentSourceRef } = setup(0, source);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.getStats().sourceSwitchCount).toBe(0);
    expect(result.current.getStats().events).toEqual([]);
    act(() => {
      currentSourceRef.current = 'sourceB';
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.getStats().sourceSwitchCount).toBe(1);
    expect(result.current.getStats().events).toEqual([
      expect.objectContaining({ type: 'sourceSwitch', detail: 'sourceB' }),
    ]);
  });

  it.each(['play', 'pause'])('isolates returned events after %s', (event) => {
    const { result, emit } = setup();
    act(() => {
      emit('play');
      jest.advanceTimersByTime(500);
      emit(event);
    });
    const snapshot = result.current.getStats();
    const expected = result.current.getStats();
    expect(snapshot.events).not.toBe(expected.events);
    snapshot.events.forEach((entry, index) => {
      expect(entry).not.toBe(expected.events[index]);
      entry.type = 'error';
      entry.timestamp = -1;
      entry.detail = 'modified';
    });
    snapshot.events.push({ type: 'error', timestamp: -2 });
    snapshot.totalPlayTime = -1;
    expect(result.current.getStats()).toEqual(expected);
  });

  it.each([
    ['pause', 500],
    ['video:ended', 500],
    ['pause', 1500],
    ['video:ended', 1500],
  ])('counts from time zero through %s at %ims', (event, elapsed) => {
    jest.setSystemTime(0);
    const { result, emit } = setup();
    act(() => {
      emit('play');
      jest.advanceTimersByTime(elapsed);
    });
    expect(result.current.getStats().totalPlayTime).toBe(elapsed);
    act(() => {
      emit(event);
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.getStats().totalPlayTime).toBe(elapsed);
  });

  it('unmount removes all listeners and the tracking interval', () => {
    const { result, emit, unmount, currentSourceRef, currentEpisodeIndexRef } = setup();
    const getStats = result.current.getStats;
    const before = getStats();
    unmount();
    expect(jest.getTimerCount()).toBe(0);
    act(() => {
      emit('play');
      jest.advanceTimersByTime(500);
    });
    expect(getStats()).toEqual(before);
    act(() => {
      emit('pause');
      emit('error', 'after unmount');
      emit('video:ended');
      currentSourceRef.current = 'sourceB';
      currentEpisodeIndexRef.current = 4;
      jest.advanceTimersByTime(2000);
    });
    expect(getStats()).toEqual(before);
  });

  it('accumulates pause count and records ended without double counting', () => {
    const { result, emit } = setup();
    act(() => {
      emit('play');
    });
    act(() => {
      jest.advanceTimersByTime(1500);
      emit('pause');
    });
    act(() => {
      emit('play');
    });
    act(() => {
      jest.advanceTimersByTime(1500);
      emit('video:ended');
    });
    const stats = result.current.getStats();
    expect(stats.pauseCount).toBe(1);
    expect(stats.totalPlayTime).toBe(3000);
    expect(stats.events.filter((e) => e.type === 'ended')).toHaveLength(1);
  });

  it('posts player errors with context', () => {
    const { emit } = setup(0, 'sourceA', () => ({
      videoId: 'v1',
      title: 'Drama',
      source: 'sourceA',
    }));
    act(() => {
      emit('error', 'MEDIA_ERR_DECODE');
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastReportBody()).toMatchObject({
      type: 'player_error',
      kind: 'error',
      message: 'MEDIA_ERR_DECODE',
      videoId: 'v1',
      title: 'Drama',
      sourceName: 'sourceA',
    });
  });

  it('dedupes identical errors within 30s', () => {
    const { emit } = setup();
    act(() => {
      emit('error', 'same');
    });
    act(() => {
      jest.advanceTimersByTime(10000);
      emit('error', 'same');
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(25000);
      emit('error', 'same');
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    act(() => {
      emit('error', 'different');
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throttles source switch reports to one per 10s', () => {
    const { currentSourceRef } = setup();
    currentSourceRef.current = 'sourceB';
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    currentSourceRef.current = 'sourceC';
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastReportBody()).toMatchObject({
      kind: 'source_switch',
      message: 'sourceB',
    });
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    currentSourceRef.current = 'sourceD';
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(lastReportBody()).toMatchObject({
      kind: 'source_switch',
      message: 'sourceD',
    });
  });

  it('binds when the player becomes available after mount', () => {
    const { result, emit, player, artPlayerRef } = setup(0, 'sourceA', undefined, true);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.getStats().events).toHaveLength(0);
    act(() => {
      artPlayerRef.current = player;
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      emit('play');
    });
    expect(
      result.current.getStats().events.filter((e) => e.type === 'play'),
    ).toHaveLength(1);
  });

  it('rebinds when the player instance is replaced', () => {
    const { result, emit: emitA, artPlayerRef } = setup();
    const { player: playerB, emit: emitB } = createPlayer();
    act(() => {
      emitA('play');
    });
    expect(
      result.current.getStats().events.filter((e) => e.type === 'play'),
    ).toHaveLength(1);
    act(() => {
      artPlayerRef.current = playerB;
      jest.advanceTimersByTime(1000);
    });
    const before = result.current.getStats().events.length;
    act(() => {
      emitA('play');
    });
    expect(result.current.getStats().events.length).toBe(before);
    act(() => {
      emitB('play');
    });
    expect(result.current.getStats().events.length).toBe(before + 1);
  });

  it('posts a summary on ended', () => {
    const { emit } = setup();
    act(() => {
      emit('play');
    });
    act(() => {
      jest.advanceTimersByTime(2000);
      emit('video:ended');
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastReportBody()).toMatchObject({
      kind: 'summary',
      message: expect.stringContaining('play 2000ms'),
    });
  });
});
