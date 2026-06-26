'use client';

import { useState } from 'react';
import MobileLayout from '../layouts/MobileLayout';

interface MobilePlayerPageProps {
  videoUrl: string;
  title: string;
  episodes: { index: number; title: string; url: string }[];
  currentEpisode: number;
  onEpisodeChange: (index: number) => void;
}

export default function MobilePlayerPage({
  videoUrl,
  title,
  episodes,
  currentEpisode,
  onEpisodeChange,
}: MobilePlayerPageProps) {
  const [showEpisodes, setShowEpisodes] = useState(false);

  return (
    <MobileLayout showNav={false}>
      {/* 视频播放器区域 */}
      <div className="relative w-full aspect-video bg-black">
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          视频播放器
        </div>
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
