'use client';

import React, { useCallback } from 'react';

const FADE_KEY = 'play-episode-toast-fade';

interface PlayEpisodeToastProps {
  message: string;
  visible: boolean;
  duration?: number;
  variant?: 'short' | 'normal';
  onClose?: () => void;
}

export function PlayEpisodeToast({
  message,
  visible,
  duration = 800,
  variant = 'short',
  onClose,
}: PlayEpisodeToastProps) {
  const handleEnd = useCallback(() => {
    onClose?.();
  }, [onClose]);

  if (!visible) return null;

  return (
    <div
      className='fixed left-1/2 -translate-x-1/2 z-[999]'
      style={{
        bottom: variant === 'short' ? '80px' : '60px',
        padding: variant === 'short' ? '6px 16px' : '10px 20px',
        borderRadius: variant === 'short' ? '20px' : '10px',
        backgroundColor:
          variant === 'short' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.85)',
        color: '#ffffff',
        fontSize: variant === 'short' ? '12px' : '14px',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(10px)',
        animation: `${FADE_KEY} ${duration}ms linear forwards`,
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      onAnimationEnd={handleEnd}
      onClick={handleEnd}
    >
      {message}
    </div>
  );
}
