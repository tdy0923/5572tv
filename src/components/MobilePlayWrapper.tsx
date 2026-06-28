'use client';

import { ReactNode, useState } from 'react';

import { useDevice } from '@/core/hooks/useDevice';

interface MobilePlayWrapperProps {
  children: ReactNode;
  title: string;
  episodes: { index: number; title: string; url: string }[];
  currentEpisode: number;
  onEpisodeChange: (index: number) => void;
}

export default function MobilePlayWrapper({
  children,
  title,
  episodes,
  currentEpisode,
  onEpisodeChange,
}: MobilePlayWrapperProps) {
  const { isMobile } = useDevice();
  const [showEpisodes, setShowEpisodes] = useState(false);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className='min-h-screen bg-[#0a0a0a] text-white'>
      <div className='relative w-full aspect-video bg-black'>{children}</div>

      <div className='p-4'>
        <h1 className='text-xl font-bold text-white mb-2'>{title}</h1>
        <p className='text-sm text-gray-400'>
          第 {currentEpisode + 1} 集 / 共 {episodes.length} 集
        </p>
      </div>

      <div className='px-4'>
        <button
          onClick={() => setShowEpisodes(!showEpisodes)}
          className='w-full py-3 bg-white/5 rounded-xl text-white font-medium'
        >
          选集 ({episodes.length}集)
        </button>
      </div>

      {showEpisodes && (
        <div className='p-4'>
          <div className='grid grid-cols-5 gap-2'>
            {episodes.map((ep, index) => (
              <button
                key={index}
                onClick={() => onEpisodeChange(index)}
                className={`py-2.5 rounded-lg text-sm font-medium ${
                  index === currentEpisode
                    ? 'bg-[#f4c24d] text-black'
                    : 'bg-white/10 text-white'
                }`}
              >
                {ep.index || index + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
