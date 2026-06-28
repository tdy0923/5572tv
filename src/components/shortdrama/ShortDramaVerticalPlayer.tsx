'use client';

import {
  ChevronDown,
  ChevronUp,
  Download,
  Heart,
  Maximize,
  Minimize,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ShortDramaVerticalPlayerProps {
  episodes: string[];
  episodesTitles: string[];
  currentIndex: number;
  onEpisodeChange: (index: number) => void;
  title: string;
  poster?: string;
  onFavorite?: () => void;
  isFavorited?: boolean;
  onShare?: () => void;
  onDownload?: () => void;
}

export default function ShortDramaVerticalPlayer({
  episodes,
  episodesTitles,
  currentIndex,
  onEpisodeChange,
  title,
  poster,
  onFavorite,
  isFavorited = false,
  onShare,
  onDownload,
}: ShortDramaVerticalPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [showBrightness, setShowBrightness] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showVolume, setShowVolume] = useState(false);
  const [swipeY, setSwipeY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);

  // 双击点赞
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;
    lastTapRef.current = now;

    if (timeDiff < 300) {
      setLiked(true);
      setLikeAnimation(true);
      setTimeout(() => setLikeAnimation(false), 800);
      onFavorite?.();
    }
  }, [onFavorite]);

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
    setSwipeY(0);
  }, []);

  // 触摸移动
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaX = touch.clientX - touchStartRef.current.x;

      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
        setSwipeY(deltaY);

        if (touchStartRef.current.x < window.innerWidth / 3) {
          setShowBrightness(true);
          const delta = (-deltaY / window.innerHeight) * 100;
          setBrightness((prev) => Math.max(0, Math.min(100, prev + delta)));
        } else if (touchStartRef.current.x > (window.innerWidth * 2) / 3) {
          setShowVolume(true);
          const delta = (-deltaY / window.innerHeight) * 100;
          setVolume((prev) => Math.max(0, Math.min(100, prev + delta)));
        }
      }
    },
    [isDragging],
  );

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (Math.abs(swipeY) > 100) {
      if (swipeY < 0 && currentIndex < episodes.length - 1) {
        onEpisodeChange(currentIndex + 1);
      } else if (swipeY > 0 && currentIndex > 0) {
        onEpisodeChange(currentIndex - 1);
      }
    }
    setIsDragging(false);
    setSwipeY(0);
    setShowBrightness(false);
    setShowVolume(false);
  }, [swipeY, currentIndex, episodes.length, onEpisodeChange]);

  // 点击切换控制栏
  const handleTap = useCallback(() => {
    handleDoubleTap();
    setShowControls((prev) => !prev);
  }, [handleDoubleTap]);

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 音量变化时同步到视频元素
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
    }
  }, [volume]);

  // 静音变化时同步到视频元素
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // 集数变化时自动播放
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  const currentUrl = episodes[currentIndex] || '';

  return (
    <div
      ref={containerRef}
      className='relative w-full h-screen h-dvh bg-black overflow-hidden select-none'
      style={{ filter: `brightness(${brightness / 100})` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
    >
      {/* 视频区域 */}
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='w-full h-full max-w-[420px] mx-auto bg-gray-900 rounded-lg overflow-hidden'>
          {currentUrl ? (
            <video
              ref={videoRef}
              className='w-full h-full object-contain'
              src={currentUrl}
              poster={poster}
              autoPlay
              playsInline
              preload='auto'
              onWaiting={() => setVideoLoading(true)}
              onCanPlay={() => setVideoLoading(false)}
              onError={() => {
                setVideoError(true);
                setVideoLoading(false);
              }}
              onEnded={() => {
                if (currentIndex < episodes.length - 1) {
                  onEpisodeChange(currentIndex + 1);
                }
              }}
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center text-gray-500'>
              <div className='text-center'>
                <div className='text-4xl mb-2'>🎬</div>
                <div className='text-sm'>暂无播放源</div>
              </div>
            </div>
          )}

          {/* 加载指示器 */}
          {videoLoading && currentUrl && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none'>
              <div className='w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin' />
            </div>
          )}
        </div>
      </div>

      {/* 滑动提示 */}
      {isDragging && Math.abs(swipeY) > 50 && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-30'>
          <div className='px-4 py-2 bg-black/60 rounded-full text-white text-sm backdrop-blur-sm'>
            {swipeY < 0 && currentIndex < episodes.length - 1 && (
              <span>
                ↑ 下一集:{' '}
                {episodesTitles[currentIndex + 1] ||
                  `第 ${currentIndex + 2} 集`}
              </span>
            )}
            {swipeY > 0 && currentIndex > 0 && (
              <span>
                ↓ 上一集:{' '}
                {episodesTitles[currentIndex - 1] || `第 ${currentIndex} 集`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 亮度指示器 */}
      {showBrightness && (
        <div className='absolute left-4 top-1/2 -translate-y-1/2 z-30'>
          <div className='w-8 h-32 bg-black/40 rounded-full overflow-hidden'>
            <div
              className='w-full bg-white/80 transition-all'
              style={{
                height: `${brightness}%`,
                marginTop: `${100 - brightness}%`,
              }}
            />
          </div>
          <div className='text-center text-white text-xs mt-1'>
            {Math.round(brightness)}%
          </div>
        </div>
      )}

      {/* 音量指示器 */}
      {showVolume && (
        <div className='absolute right-4 top-1/2 -translate-y-1/2 z-30'>
          <div className='w-8 h-32 bg-black/40 rounded-full overflow-hidden'>
            <div
              className='w-full bg-white/80 transition-all'
              style={{ height: `${volume}%`, marginTop: `${100 - volume}%` }}
            />
          </div>
          <div className='text-center text-white text-xs mt-1'>
            {Math.round(volume)}%
          </div>
        </div>
      )}

      {/* 点赞动画 */}
      {likeAnimation && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-40'>
          <Heart className='w-24 h-24 text-red-500 fill-red-500 animate-bounce' />
        </div>
      )}

      {/* 右侧操作栏 */}
      {showControls && (
        <div className='absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-20'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div className='p-4 rounded-full bg-black/30 backdrop-blur-sm'>
              {isFullscreen ? (
                <Minimize className='w-6 h-6 text-white' />
              ) : (
                <Maximize className='w-6 h-6 text-white' />
              )}
            </div>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.();
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div
              className={`p-4 rounded-full ${liked ? 'bg-red-500/20' : 'bg-black/30'} backdrop-blur-sm`}
            >
              <Heart
                className={`w-6 h-6 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`}
              />
            </div>
            <span className='text-white text-xs mt-1'>收藏</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare?.();
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div className='p-4 rounded-full bg-black/30 backdrop-blur-sm'>
              <Share2 className='w-6 h-6 text-white' />
            </div>
            <span className='text-white text-xs mt-1'>分享</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload?.();
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div className='p-4 rounded-full bg-black/30 backdrop-blur-sm'>
              <Download className='w-6 h-6 text-white' />
            </div>
            <span className='text-white text-xs mt-1'>下载</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className='flex flex-col items-center min-h-[56px] min-w-[56px]'
          >
            <div className='p-4 rounded-full bg-black/30 backdrop-blur-sm'>
              {isMuted ? (
                <VolumeX className='w-6 h-6 text-white' />
              ) : (
                <Volume2 className='w-6 h-6 text-white' />
              )}
            </div>
            <span className='text-white text-xs mt-1'>
              {isMuted ? '取消静音' : '静音'}
            </span>
          </button>
        </div>
      )}

      {/* 顶部信息栏 */}
      {showControls && (
        <div className='absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-20'>
          <div className='flex items-center justify-between'>
            <div className='min-w-0 flex-1'>
              <h1 className='text-white text-lg font-bold truncate'>{title}</h1>
              <p className='text-white/70 text-sm'>
                {episodesTitles[currentIndex] || `第 ${currentIndex + 1} 集`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 底部信息栏 */}
      {showControls && (
        <div className='absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-20'>
          {/* 进度条 */}
          <div className='mb-3'>
            <div className='h-1 bg-white/30 rounded-full overflow-hidden'>
              <div
                className='h-full bg-white rounded-full transition-all'
                style={{
                  width: `${((currentIndex + 1) / episodes.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* 集数指示 */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-white text-sm font-medium'>
                {currentIndex + 1} / {episodes.length}
              </span>
              <span className='text-white/60 text-xs'>
                {episodesTitles[currentIndex] || ''}
              </span>
            </div>

            {/* 切换集数按钮 */}
            <div className='flex items-center gap-2'>
              {currentIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEpisodeChange(currentIndex - 1);
                  }}
                  className='p-2 rounded-full bg-white/20 backdrop-blur-sm'
                >
                  <ChevronUp className='w-5 h-5 text-white' />
                </button>
              )}
              {currentIndex < episodes.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEpisodeChange(currentIndex + 1);
                  }}
                  className='p-2 rounded-full bg-white/20 backdrop-blur-sm'
                >
                  <ChevronDown className='w-5 h-5 text-white' />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 集数切换提示 - 屏幕中间 */}
      {!showControls && (
        <div className='absolute bottom-8 left-1/2 -translate-x-1/2 z-10'>
          <div className='px-3 py-1 bg-black/40 rounded-full text-white text-xs backdrop-blur-sm'>
            {currentIndex + 1} / {episodes.length}
          </div>
        </div>
      )}
    </div>
  );
}
