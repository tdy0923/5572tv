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
  getContext?: () => {
    videoId?: string;
    title?: string;
    source?: string;
  },
) {
  const statsRef = useRef<PlayerAnalytics>({
    totalPlayTime: 0,
    pauseCount: 0,
    errorCount: 0,
    sourceSwitchCount: 0,
    episodeChangeCount: 0,
    events: [],
  });

  const lastSourceRef = useRef<string | null>(null);
  const lastEpisodeRef = useRef<number | null>(null);
  const playStartRef = useRef<number | null>(null);
  const contextRef = useRef(getContext);
  const lastReportRef = useRef({ errorMsg: '', errorTs: 0, switchTs: 0 });

  useEffect(() => {
    contextRef.current = getContext;
  });

  const report = useCallback(
    (kind: 'error' | 'source_switch' | 'summary', message: string) => {
      try {
        if (typeof fetch === 'undefined') return;
        const ctx = contextRef.current?.() ?? {};
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            type: 'player_error',
            kind,
            message: message.slice(0, 300),
            videoId: ctx.videoId,
            title: ctx.title,
            sourceName: ctx.source,
          }),
        }).catch(() => undefined);
      } catch {
        return;
      }
    },
    [],
  );

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

  const boundPlayerRef = useRef<any>(null);
  const detachRef = useRef<(() => void) | null>(null);

  const bindPlayer = useCallback(() => {
    const player = artPlayerRef.current;
    if (
      !player ||
      typeof player.on !== 'function' ||
      typeof player.off !== 'function'
    ) {
      return;
    }
    if (boundPlayerRef.current === player) return;
    detachRef.current?.();

    const onPlay = () => {
      if (playStartRef.current == null) {
        playStartRef.current = Date.now();
      }
      recordEvent('play');
    };
    const onPause = () => {
      if (playStartRef.current != null) {
        statsRef.current.totalPlayTime += Date.now() - playStartRef.current;
        playStartRef.current = null;
      }
      statsRef.current.pauseCount++;
      recordEvent('pause');
    };
    const onError = (err: any) => {
      statsRef.current.errorCount++;
      const detail = String(err).slice(0, 300);
      recordEvent('error', detail);
      const now = Date.now();
      const last = lastReportRef.current;
      if (detail !== last.errorMsg || now - last.errorTs >= 30000) {
        last.errorMsg = detail;
        last.errorTs = now;
        report('error', detail);
      }
    };
    const onEnded = () => {
      if (playStartRef.current != null) {
        statsRef.current.totalPlayTime += Date.now() - playStartRef.current;
        playStartRef.current = null;
      }
      recordEvent('ended');
      const s = statsRef.current;
      report(
        'summary',
        `play ${s.totalPlayTime}ms pauses ${s.pauseCount} errors ${s.errorCount} switches ${s.sourceSwitchCount}`,
      );
    };

    player.on('play', onPlay);
    player.on('pause', onPause);
    player.on('error', onError);
    player.on('video:ended', onEnded);
    detachRef.current = () => {
      try {
        player.off('play', onPlay);
        player.off('pause', onPause);
        player.off('error', onError);
        player.off('video:ended', onEnded);
      } catch {
        return;
      }
    };
    boundPlayerRef.current = player;
  }, [artPlayerRef, recordEvent, report]);

  useEffect(() => {
    bindPlayer();
    return () => {
      detachRef.current?.();
      detachRef.current = null;
      boundPlayerRef.current = null;
    };
  }, [bindPlayer]);

  useEffect(() => {
    if (lastSourceRef.current === null) {
      lastSourceRef.current = currentSourceRef.current;
    }
    if (lastEpisodeRef.current === null) {
      lastEpisodeRef.current = currentEpisodeIndexRef.current;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      bindPlayer();
      const currentSource = currentSourceRef.current;
      if (currentSource !== lastSourceRef.current) {
        lastSourceRef.current = currentSource;
        statsRef.current.sourceSwitchCount++;
        recordEvent('sourceSwitch', currentSource);
        const last = lastReportRef.current;
        if (now - last.switchTs >= 10000) {
          last.switchTs = now;
          report('source_switch', String(currentSource).slice(0, 300));
        }
      }
      const currentEp = currentEpisodeIndexRef.current;
      if (currentEp !== lastEpisodeRef.current) {
        lastEpisodeRef.current = currentEp;
        statsRef.current.episodeChangeCount++;
        recordEvent('episodeChange', String(currentEp));
      }
      if (playStartRef.current != null) {
        statsRef.current.totalPlayTime += now - playStartRef.current;
        playStartRef.current = now;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSourceRef, currentEpisodeIndexRef, recordEvent, report, bindPlayer]);

  return {
    getStats: () => ({
      ...statsRef.current,
      totalPlayTime:
        statsRef.current.totalPlayTime +
        (playStartRef.current == null ? 0 : Date.now() - playStartRef.current),
      events: statsRef.current.events.map((event) => ({ ...event })),
    }),
    reset: () => {
      statsRef.current = {
        totalPlayTime: 0,
        pauseCount: 0,
        errorCount: 0,
        sourceSwitchCount: 0,
        episodeChangeCount: 0,
        events: [],
      };
      playStartRef.current = null;
      lastSourceRef.current = currentSourceRef.current;
      lastEpisodeRef.current = currentEpisodeIndexRef.current;
    },
  };
}
