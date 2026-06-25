'use client';

import { ChevronDown, MonitorPlay } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ExternalPlayerButtonProps {
  videoUrl: string;
  videoTitle: string;
  enabled: boolean;
}

interface PlayerConfig {
  id: string;
  name: string;
  icon: string;
  buildUrl: (url: string) => string;
  platforms: string[];
}

const PLAYERS: PlayerConfig[] = [
  {
    id: 'potplayer',
    name: 'PotPlayer',
    icon: '/players/potplayer.svg',
    buildUrl: (url) => `potplayer://${url}`,
    platforms: ['Windows'],
  },
  {
    id: 'vlc',
    name: 'VLC',
    icon: '/players/vlc.svg',
    buildUrl: (url) =>
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod/i.test(navigator.userAgent)
        ? `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url)}`
        : `vlc://${url}`,
    platforms: ['Windows', 'macOS', 'iOS', 'Android'],
  },
  {
    id: 'mpv',
    name: 'MPV',
    icon: '/players/mpv.svg',
    buildUrl: (url) => `mpv://${url}`,
    platforms: ['Windows', 'macOS', 'Linux'],
  },
  {
    id: 'mxplayer',
    name: 'MX Player',
    icon: '/players/mxplayer.svg',
    buildUrl: (url) =>
      `intent:${url}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;end`,
    platforms: ['Android'],
  },
  {
    id: 'nplayer',
    name: 'nPlayer',
    icon: '/players/nplayer.svg',
    buildUrl: (url) => `nplayer-${url}`,
    platforms: ['iOS', 'Android'],
  },
  {
    id: 'iina',
    name: 'IINA',
    icon: '/players/iina.svg',
    buildUrl: (url) => `iina://weblink?url=${encodeURIComponent(url)}`,
    platforms: ['macOS'],
  },
];

const ExternalPlayerButton = memo(function ExternalPlayerButton({
  videoUrl,
  videoTitle: _videoTitle,
  enabled,
}: ExternalPlayerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenPlayer = useCallback(
    (player: PlayerConfig) => {
      if (!videoUrl) return;
      const playerUrl = player.buildUrl(videoUrl);
      window.location.href = playerUrl;
      setIsOpen(false);
    },
    [videoUrl],
  );

  const [detectPlatform, setDetectPlatform] = useState('unknown');
  const platformDetectedRef = useRef(false);

  useEffect(() => {
    if (platformDetectedRef.current) return;
    platformDetectedRef.current = true;
    const ua = navigator.userAgent;
    let platform = 'unknown';
    if (/iPad|iPhone|iPod/i.test(ua)) platform = 'iOS';
    else if (/Android/i.test(ua)) platform = 'Android';
    else if (/Mac/i.test(ua)) platform = 'macOS';
    else if (/Win/i.test(ua)) platform = 'Windows';
    else if (/Linux/i.test(ua)) platform = 'Linux';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount detection
    setDetectPlatform(platform);
  }, []);

  const recommendedPlayers = useMemo(() => {
    return PLAYERS.filter(
      (p) =>
        p.platforms.includes(detectPlatform) || p.platforms.includes('Windows'),
    );
  }, [detectPlatform]);

  if (!enabled || !videoUrl) return null;

  return (
    <div className='relative'>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className='flex group relative items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 min-h-[44px] rounded-2xl bg-linear-to-br from-white/90 via-white/80 to-white/70 hover:from-white hover:via-white/95 hover:to-white/90 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-800/70 dark:hover:from-gray-800 dark:hover:via-gray-800/95 dark:hover:to-gray-800/90 backdrop-blur-md border border-white/60 dark:border-gray-700/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.25)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.3)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden'
        title='外部播放器'
      >
        <div className='absolute inset-0 bg-linear-to-r from-transparent via-white/0 to-transparent group-hover:via-white/30 dark:group-hover:via-white/10 transition-all duration-500'></div>
        <MonitorPlay className='relative z-10 w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-600 dark:text-gray-400' />
        <span className='relative z-10 hidden sm:inline text-xs font-medium text-gray-600 dark:text-gray-300'>
          外部播放
        </span>
        <ChevronDown
          className={`relative z-10 w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className='fixed inset-0 z-40'
            onClick={() => setIsOpen(false)}
          />
          <div className='absolute right-0 top-full mt-2 z-50 w-56 py-2 ui-surface rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60'>
            <div className='px-3 py-1.5 text-xs font-medium text-gray-400 dark:text-gray-500'>
              选择播放器
            </div>
            {recommendedPlayers.map((player) => (
              <button
                key={player.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPlayer(player);
                }}
                className='flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors'
              >
                <img
                  src={player.icon}
                  alt={player.name}
                  className='w-6 h-6 rounded'
                  loading='lazy'
                />
                <span className='font-medium'>{player.name}</span>
                {player.platforms.includes(detectPlatform) && (
                  <span className='ml-auto text-[10px] text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full'>
                    推荐
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

export default ExternalPlayerButton;
