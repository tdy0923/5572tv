'use client';

import { ReactNode, useState } from 'react';
import { useDevice } from '@/core/hooks/useDevice';
import MobileLayout from '@/ui/mobile/layouts/MobileLayout';

interface MobilePlayWrapperProps {
  children: ReactNode;
  title: string;
  episodes: { index: number; title: string; url: string }[];
  currentEpisode: number;
  onEpisodeChange: (index: number) => void;
}

/**
 * 移动端播放页包装器
 * 提供移动端播放体验
 */
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
    <MobileLayout showNav={false}>
      {/* 视频播放器区域 */}
      <div className="relative w-full aspect-video bg-black">
        {children}
      </div>

      {/* 视频信息 */}
      <div className="p-4">
        <h1 className="text-xl font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-gray-400">
          第 {currentEpisode + 1} 集 / 共 {episodes.length} 集
        </p>
      </div>

      {/* 选集按钮 */}
      <div className="px-4">
        <button
          onClick={() => setShowEpisodes(!showEpisodes)}
          className="w-full py-3 bg-white/5 rounded-xl text-white font-medium"
        >
          选集 ({episodes.length}集)
        </button>
      </div>

      {/* 选集面板 */}
      {showEpisodes && (
        <div className="p-4">
          <div className="grid grid-cols-6 gap-2">
            {episodes.map((ep, index) => (
              <button
                key={index}
                onClick={() => onEpisodeChange(index)}
                className={`py-2 rounded-lg text-sm font-medium ${
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
    </MobileLayout>
  );
}
