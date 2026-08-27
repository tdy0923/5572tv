import { useCallback, useEffect, useRef } from 'react';

interface PlayerEvent {
  type: 'play' | 'pause' | 'error' | 'sourceSwitch' | 'episodeChange' | 'ended';
  timestamp: number;
  detail?: string;
}

interface PlayerAnalytics {
  totalPlayTime: number;
  pauseCount: number;
  errorCount: number;
  sourceSwitchCount: number;
  episodeChangeCount: number;
  events: PlayerEvent[];
}

const MAX_EVENTS = 100;

export function usePlayerAnalytics(
  artPlayerRef: React.RefObject<any>,
  currentSourceRef: React.MutableRefObject<string>,
  currentEpisodeIndexRef: React.MutableRefObject<number>,
) {
  const statsRef = useRef<PlayerAnalytics>({
    totalPlayTime: 0,
    pauseCount: 0,
    errorCount: 0,
    sourceSwitchCount: 0,
    episodeChangeCount: 0,
    events: [],
  });

  const lastSourceRef = useRef('');
  const lastEpisodeRef = useRef(0);
  const playStartRef = useRef<number | null>(null);

  const recordEvent = useCallback(
    (type: PlayerEvent['type'], detail?: string) => {
      const stats = statsRef.current;
      stats.events.push({
        type,
        timestamp: Date.now(),
        detail,
      });
      if (stats.events.length > MAX_EVENTS) {
        stats.events = stats.events.slice(-MAX_EVENTS);
      }
    },
    [],
  );

  useEffect(() => {
    if (!artPlayerRef.current) return;
    const player = artPlayerRef.current;

    const onPlay = () => {
      playStartRef.current = Date.now();
      recordEvent('play');
    };
    const onPause = () => {
      if (playStartRef.current) {
        statsRef.current.totalPlayTime += Date.now() - playStartRef.current;
        playStartRef.current = null;
      }
      statsRef.current.pauseCount++;
      recordEvent('pause');
    };
    const onError = (err: any) => {
      statsRef.current.errorCount++;
      recordEvent('error', String(err));
    };
    const onEnded = () => {
      if (playStartRef.current) {
        statsRef.current.totalPlayTime += Date.now() - playStartRef.current;
        playStartRef.current = null;
      }
      recordEvent('ended');
    };

    player.on('play', onPlay);
    player.on('pause', onPause);
    player.on('error', onError);
    player.on('video:ended', onEnded);

    return () => {
      player.off('play', onPlay);
      player.off('pause', onPause);
      player.off('error', onError);
      player.off('video:ended', onEnded);
    };
  }, [artPlayerRef, recordEvent]);

  useEffect(() => {
    if (!lastSourceRef.current)
      lastSourceRef.current = currentSourceRef.current;
    if (lastEpisodeRef.current < 0)
      lastEpisodeRef.current = currentEpisodeIndexRef.current;

    const interval = setInterval(() => {
      const currentSource = currentSourceRef.current;
      if (currentSource !== lastSourceRef.current) {
        lastSourceRef.current = currentSource;
        statsRef.current.sourceSwitchCount++;
        recordEvent('sourceSwitch', currentSource);
      }
      const currentEp = currentEpisodeIndexRef.current;
      if (currentEp !== lastEpisodeRef.current) {
        lastEpisodeRef.current = currentEp;
        statsRef.current.episodeChangeCount++;
        recordEvent('episodeChange', String(currentEp));
      }
      if (playStartRef.current) {
        statsRef.current.totalPlayTime += 1000;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSourceRef, currentEpisodeIndexRef, recordEvent]);

  return {
    getStats: () => ({ ...statsRef.current }),
    reset: () => {
      statsRef.current = {
        totalPlayTime: 0,
        pauseCount: 0,
        errorCount: 0,
        sourceSwitchCount: 0,
        episodeChangeCount: 0,
        events: [],
      };
    },
  };
}
