import { useCallback, useEffect } from 'react';

interface ShortcutDeps {
  artPlayerRef: React.RefObject<any>;
  detailRef: React.RefObject<any>;
  currentEpisodeIndexRef: React.RefObject<number>;
  handlePreviousEpisode: () => void;
  handleNextEpisode: () => void;
  setShowShortcutsHelp: (v: boolean) => void;
  showShortcutsHelp: boolean;
}

export function useKeyboardShortcuts(deps: ShortcutDeps) {
  const {
    artPlayerRef,
    detailRef,
    currentEpisodeIndexRef,
    handlePreviousEpisode,
    handleNextEpisode,
    setShowShortcutsHelp,
    showShortcutsHelp,
  } = deps;

  const handleKeyboardShortcuts = useCallback(
    (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      )
        return;

      if (e.altKey && e.key === 'ArrowLeft') {
        if (detailRef.current && currentEpisodeIndexRef.current > 0) {
          handlePreviousEpisode();
          e.preventDefault();
        }
      }
      if (e.altKey && e.key === 'ArrowRight') {
        const d = detailRef.current;
        const idx = currentEpisodeIndexRef.current;
        if (d && d.episodes && idx < d.episodes.length - 1) {
          handleNextEpisode();
          e.preventDefault();
        }
      }
      if (!e.altKey && e.key === 'ArrowLeft') {
        if (artPlayerRef.current && artPlayerRef.current.currentTime > 5) {
          artPlayerRef.current.currentTime -= 10;
          e.preventDefault();
        }
      }
      if (!e.altKey && e.key === 'ArrowRight') {
        if (
          artPlayerRef.current &&
          artPlayerRef.current.currentTime < artPlayerRef.current.duration - 5
        ) {
          artPlayerRef.current.currentTime += 10;
          e.preventDefault();
        }
      }
      if (e.key === 'ArrowUp') {
        if (artPlayerRef.current && artPlayerRef.current.volume < 1) {
          artPlayerRef.current.volume =
            Math.round((artPlayerRef.current.volume + 0.1) * 10) / 10;
          artPlayerRef.current.notice.show = `音量: ${Math.round(artPlayerRef.current.volume * 100)}`;
          e.preventDefault();
        }
      }
      if (e.key === 'ArrowDown') {
        if (artPlayerRef.current && artPlayerRef.current.volume > 0) {
          artPlayerRef.current.volume =
            Math.round((artPlayerRef.current.volume - 0.1) * 10) / 10;
          artPlayerRef.current.notice.show = `音量: ${Math.round(artPlayerRef.current.volume * 100)}`;
          e.preventDefault();
        }
      }
      if (e.key === ' ') {
        if (artPlayerRef.current) {
          artPlayerRef.current.toggle();
          e.preventDefault();
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        if (artPlayerRef.current) {
          artPlayerRef.current.fullscreen = !artPlayerRef.current.fullscreen;
          e.preventDefault();
        }
      }
      if (e.key === '?') {
        setShowShortcutsHelp(true);
        e.preventDefault();
      }
      if (e.key === 'Escape' && showShortcutsHelp) {
        setShowShortcutsHelp(false);
        e.preventDefault();
      }
    },
    [
      artPlayerRef,
      detailRef,
      currentEpisodeIndexRef,
      handlePreviousEpisode,
      handleNextEpisode,
      setShowShortcutsHelp,
      showShortcutsHelp,
    ],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () =>
      document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);
}
