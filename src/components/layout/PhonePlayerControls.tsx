'use client';

import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Maximize2,
  Volume2,
  Settings
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface PhonePlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onFullscreen: () => void;
  currentTime: number;
  duration: number;
}

export default function PhonePlayerControls({
  isPlaying,
  onPlayPause,
  onSeek,
  onFullscreen,
  currentTime,
  duration,
}: PhonePlayerControlsProps) {
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 自动隐藏控制栏
  useEffect(() => {
    if (showControls) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [showControls, isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="absolute inset-0 flex flex-col justify-between"
      onClick={() => setShowControls(true)}
    >
      {/* 顶部渐变 */}
      <div className="h-24 bg-gradient-to-b from-black/60 to-transparent" />

      {/* 中间区域 - 点击播放/暂停 */}
      <div
        className="flex-1 flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          onPlayPause();
        }}
      >
        {!showControls && (
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" />
            )}
          </div>
        )}
      </div>

      {/* 底部控制栏 */}
      {showControls && (
        <div className="bg-gradient-to-t from-black/80 to-transparent pt-8 pb-4 px-4">
          {/* 进度条 */}
          <div className="mb-4">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between mt-1 text-xs text-white/80">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(currentTime - 10);
                }}
                className="p-2 text-white/80 hover:text-white"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayPause();
                }}
                className="p-3 bg-white/20 rounded-full backdrop-blur-sm"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6 text-white" />
                ) : (
                  <Play className="h-6 w-6 text-white ml-0.5" />
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(currentTime + 10);
                }}
                className="p-2 text-white/80 hover:text-white"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 text-white/80 hover:text-white">
                <Volume2 className="h-5 w-5" />
              </button>
              <button className="p-2 text-white/80 hover:text-white">
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFullscreen();
                }}
                className="p-2 text-white/80 hover:text-white"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
