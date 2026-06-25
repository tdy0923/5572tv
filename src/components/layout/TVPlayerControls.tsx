'use client';

import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2,
  Settings,
  Subtitles
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { useTVNavigation } from '@/hooks/useTVNavigation';

interface TVPlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onSettings?: () => void;
  onSubtitles?: () => void;
  currentTime: number;
  duration: number;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const controlItems = [
  { id: 'skipBack', label: '后退10秒', icon: SkipBack },
  { id: 'playPause', label: '播放/暂停', icon: Play },
  { id: 'skipForward', label: '前进10秒', icon: SkipForward },
  { id: 'volume', label: '音量', icon: Volume2 },
  { id: 'subtitles', label: '字幕', icon: Subtitles },
  { id: 'settings', label: '设置', icon: Settings },
];

export default function TVPlayerControls({
  isPlaying,
  onPlayPause,
  onSeek,
  onSettings,
  onSubtitles,
  currentTime,
  duration,
  volume,
  onVolumeChange,
}: TVPlayerControlsProps) {
  const [showControls, setShowControls] = useState(true);

  const handleActivate = useCallback(
    (index: number) => {
      const item = controlItems[index];
      switch (item.id) {
        case 'skipBack':
          onSeek(currentTime - 10);
          break;
        case 'playPause':
          onPlayPause();
          break;
        case 'skipForward':
          onSeek(currentTime + 10);
          break;
        case 'volume':
          // 循环音量: 0 -> 50 -> 100 -> 0
          onVolumeChange(volume === 0 ? 50 : volume === 50 ? 100 : 0);
          break;
        case 'subtitles':
          onSubtitles?.();
          break;
        case 'settings':
          onSettings?.();
          break;
      }
    },
    [currentTime, volume, onSeek, onPlayPause, onVolumeChange, onSettings, onSubtitles]
  );

  const { focusIndex, containerRef, getFocusStyle } = useTVNavigation({
    columns: controlItems.length,
    totalItems: controlItems.length,
    onActivate: handleActivate,
    loop: false,
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 flex flex-col justify-end">
      {/* 顶部渐变 */}
      <div className="h-32 bg-gradient-to-b from-black/60 to-transparent" />

      {/* 底部控制区域 */}
      <div className="bg-gradient-to-t from-black/90 to-transparent pt-12 pb-8 px-8">
        {/* 进度条 */}
        <div className="mb-6">
          <div className="relative h-2 bg-white/30 rounded-full">
            <div
              className="absolute h-full bg-green-500 rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-lg text-white/80">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div
          ref={containerRef}
          className="flex items-center justify-center gap-4"
        >
          {controlItems.map((item, index) => {
            const isFocused = index === focusIndex;
            const Icon = item.icon;

            // 特殊图标处理
            let IconComponent = Icon;
            if (item.id === 'playPause') {
              IconComponent = isPlaying ? Pause : Play;
            }

            return (
              <button
                key={item.id}
                className={`flex flex-col items-center gap-2 px-6 py-4 rounded-xl transition-all duration-200 ${
                  isFocused
                    ? 'bg-white/20 text-white scale-110'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                style={getFocusStyle(index)}
              >
                <IconComponent className="h-8 w-8" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* 音量指示 */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <Volume2 className="h-5 w-5 text-white/60" />
          <div className="w-32 h-1.5 bg-white/30 rounded-full">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${volume}%` }}
            />
          </div>
          <span className="text-sm text-white/60 w-10 text-right">{volume}%</span>
        </div>
      </div>
    </div>
  );
}
