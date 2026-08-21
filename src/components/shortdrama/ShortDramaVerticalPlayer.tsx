'use client';

import {
  ChevronDown,
  ChevronUp,
  Download,
  Film,
  Frown,
  Heart,
  LayoutGrid,
  List,
  Maximize,
  Minimize,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getHlsModule } from '@/app/play/utils';

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
  onExitVerticalMode?: () => void;
}

const AUTOPLAY_NEXT_KEY = '5572tv_autoplay_next_vertical';

export default function ShortDramaVerticalPlayer({
  episodes,
  episodesTitles,
  currentIndex,
  onEpisodeChange,
  title,
  poster,
  onFavorite,
  onShare,
  onDownload,
  onExitVerticalMode,
}: ShortDramaVerticalPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(AUTOPLAY_NEXT_KEY) !== 'false';
    } catch {
      return true;
    }
  });
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [episodeSwitching, setEpisodeSwitching] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState<{
    time: number;
    side: 'left' | 'right';
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);
  const controlsTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 集数变化时重置状态
  const handleEpisodeChange = useCallback(
    (index: number) => {
      setVideoError(false);
      setVideoLoading(true);
      setEpisodeSwitching(true);
      onEpisodeChange(index);
      setTimeout(() => setEpisodeSwitching(false), 300);
    },
    [onEpisodeChange],
  );

  // 自动隐藏控制栏（3秒后）
  useEffect(() => {
    if (showControls) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [showControls, currentIndex]);

  // 双击快进/快退（左侧快退5秒，右侧快进5秒）
  const handleDoubleTap = useCallback(
    (clientX?: number) => {
      const now = Date.now();
      const timeDiff = now - lastTapRef.current;
      lastTapRef.current = now;

      if (timeDiff < 300) {
        if (videoRef.current) {
          const isLeftSide = clientX ? clientX < window.innerWidth / 2 : false;
          const seekDelta = isLeftSide ? -5 : 5;
          videoRef.current.currentTime = Math.max(
            0,
            Math.min(duration, videoRef.current.currentTime + seekDelta),
          );
          setSeekIndicator({
            time: videoRef.current.currentTime,
            side: isLeftSide ? 'left' : 'right',
          });
          setTimeout(() => setSeekIndicator(null), 800);
        }
      }
    },
    [duration],
  );

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
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (Math.abs(swipeY) > 100) {
        if (swipeY < 0 && currentIndex < episodes.length - 1) {
          handleEpisodeChange(currentIndex + 1);
        } else if (swipeY > 0 && currentIndex > 0) {
          handleEpisodeChange(currentIndex - 1);
        }
      }
      setIsDragging(false);
      setSwipeY(0);
      setShowBrightness(false);
      setShowVolume(false);
      handleDoubleTap(e.changedTouches[0]?.clientX);
    },
    [
      swipeY,
      currentIndex,
      episodes.length,
      handleEpisodeChange,
      handleDoubleTap,
    ],
  );

  // 点击切换控制栏
  const handleTap = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

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

  // 集数变化时自动播放（支持 HLS / m3u8）
  useEffect(() => {
    const video = videoRef.current;
    const url = episodes[currentIndex] || '';
    if (!video || !url) return;

    // 清理旧的 HLS 实例
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    // 所有 m3u8 强制走代理以彻底解决 CORS
    const effectiveUrl = `/api/proxy/m3u8?url=${encodeURIComponent(url)}`;
    const isHls = url.includes('.m3u8');
    if (isHls) {
      const canNative = false;
      if (canNative) {
        video.src = effectiveUrl;
        video.load();
        video.play().catch(() => {});
        return;
      }
      // 其他平台用 hls.js
      (async () => {
        try {
          const Hls = await getHlsModule();
          if (!Hls || !Hls.isSupported()) {
            video.src = effectiveUrl;
            video.load();
            video.play().catch(() => {});
            return;
          }
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hlsRef.current = hls;
          hls.loadSource(effectiveUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data?.fatal) {
              setVideoError(true);
              setVideoLoading(false);
            }
          });
        } catch {
          video.src = effectiveUrl;
          video.load();
          video.play().catch(() => {});
        }
      })();
      return;
    }

    // 普通 MP4
    video.src = effectiveUrl;
    video.load();
    video.play().catch(() => {});
  }, [currentIndex, episodes]);

  // 清理 HLS 实例
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, []);

  // 自动连播开关持久化
  useEffect(() => {
    try {
      localStorage.setItem(AUTOPLAY_NEXT_KEY, String(autoPlayNext));
    } catch {
      // ignore
    }
  }, [autoPlayNext]);

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
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${episodeSwitching ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className='w-full h-full max-w-[420px] mx-auto bg-gray-900 rounded-lg overflow-hidden'>
          {currentUrl ? (
            <video
              ref={videoRef}
              className='w-full h-full object-contain'
              poster={poster}
              autoPlay
              playsInline
              preload='auto'
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onWaiting={() => setVideoLoading(true)}
              onCanPlay={() => setVideoLoading(false)}
              onError={() => {
                setVideoError(true);
                setVideoLoading(false);
              }}
              onEnded={() => {
                if (autoPlayNext && currentIndex < episodes.length - 1) {
                  handleEpisodeChange(currentIndex + 1);
                }
              }}
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center text-gray-500'>
              <div className='text-center'>
                <Film className='text-4xl mb-2 text-gray-500' />
                <div className='text-sm'>暂无播放源</div>
              </div>
            </div>
          )}

          {/* 加载指示器 */}
          {videoLoading && currentUrl && !videoError && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none'>
              <div className='w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin' />
            </div>
          )}

          {/* 错误重试 */}
          {videoError && (
            <div className='absolute inset-0 flex items-center justify-center bg-black/60 z-30'>
              <div className='text-center'>
                <Frown className='text-4xl mb-3 text-gray-500' />
                <p className='text-white text-sm mb-4'>视频加载失败</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoError(false);
                    setVideoLoading(true);
                    videoRef.current?.load();
                    videoRef.current?.play().catch(() => {});
                  }}
                  className='px-6 py-2 bg-white text-black rounded-full text-sm font-medium'
                >
                  点击重试
                </button>
              </div>
            </div>
          )}

          {/* 快进/快退指示器 */}
          {seekIndicator && (
            <div
              className={`absolute ${seekIndicator.side === 'left' ? 'left-1/4' : 'right-1/4'} top-1/2 -translate-y-1/2 z-30 pointer-events-none animate-fade-out`}
            >
              <div className='flex flex-col items-center'>
                <div className='text-white text-3xl font-bold'>
                  {seekIndicator.side === 'left' ? '-5s' : '+5s'}
                </div>
              </div>
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
              setLiked(!liked);
              setLikeAnimation(true);
              setTimeout(() => setLikeAnimation(false), 800);
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
        <div className='absolute top-0 left-0 right-0 px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-gradient-to-b from-black/60 to-transparent z-20'>
          <div className='flex items-center justify-between'>
            <div className='min-w-0 flex-1'>
              <h1 className='text-white text-lg font-bold truncate'>{title}</h1>
              <p className='text-white/70 text-sm'>
                {episodesTitles[currentIndex] || `第 ${currentIndex + 1} 集`}
              </p>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEpisodeList(true);
                }}
                className='flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-white text-sm'
              >
                <List className='w-4 h-4' />
                选集
              </button>
              {onExitVerticalMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExitVerticalMode();
                  }}
                  className='flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-white text-sm'
                >
                  <LayoutGrid className='w-4 h-4' />
                  标准
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 底部信息栏 */}
      {showControls && (
        <div className='absolute bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-black/60 to-transparent z-20'>
          {/* 真实视频进度条 */}
          <div className='mb-3' onClick={(e) => e.stopPropagation()}>
            <div
              className='h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer'
              onClick={(e) => {
                if (videoRef.current && duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  videoRef.current.currentTime = pos * duration;
                }
              }}
            >
              <div
                className='h-full bg-white rounded-full transition-all'
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* 时间和集数指示 */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-white text-sm font-medium'>
                {currentIndex + 1} / {episodes.length}
              </span>
              <span className='text-white/60 text-xs'>
                {duration > 0
                  ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                  : ''}
              </span>
            </div>

            {/* 切换集数按钮 */}
            <div className='flex items-center gap-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoPlayNext((prev) => !prev);
                }}
                className={`flex items-center gap-1 rounded-full px-3 py-2 text-xs ${
                  autoPlayNext
                    ? 'bg-green-500/80 text-white'
                    : 'bg-white/20 text-white/70'
                }`}
              >
                <Film className='w-3.5 h-3.5' />
                {autoPlayNext ? '连播开' : '连播关'}
              </button>
              {currentIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEpisodeChange(currentIndex - 1);
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
                    handleEpisodeChange(currentIndex + 1);
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

      {/* 选集抽屉 */}
      {showEpisodeList && (
        <div
          className='absolute inset-0 z-50 bg-black/70'
          onClick={(e) => {
            e.stopPropagation();
            setShowEpisodeList(false);
          }}
        >
          <div
            className='absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between mb-3'>
              <span className='text-white font-semibold'>选集</span>
              <button
                onClick={() => setShowEpisodeList(false)}
                className='text-white/70 text-sm px-2 py-1'
              >
                关闭
              </button>
            </div>
            <div className='max-h-[50vh] overflow-y-auto'>
              <div className='grid grid-cols-4 sm:grid-cols-6 gap-2'>
                {episodes.map((ep, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setShowEpisodeList(false);
                      if (idx !== currentIndex) handleEpisodeChange(idx);
                    }}
                    className={`rounded-lg py-2.5 text-sm ${
                      idx === currentIndex
                        ? 'bg-green-500 text-white font-semibold'
                        : 'bg-gray-800 text-white/80'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div className='flex flex-wrap gap-2 mt-3'>
                {episodesTitles.map(
                  (t, idx) =>
                    t && (
                      <button
                        key={`t-${idx}`}
                        onClick={() => {
                          setShowEpisodeList(false);
                          if (idx !== currentIndex) handleEpisodeChange(idx);
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs ${
                          idx === currentIndex
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-800 text-white/70'
                        }`}
                      >
                        {t}
                      </button>
                    ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
