'use client';

import {
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

// 🚀 TanStack Query Queries & Mutations
import {
  shouldSkipTrailerRefresh,
  useClearTrailerUrlMutation,
  useRefreshedTrailerUrlsQuery,
  useRefreshTrailerUrlMutation,
} from '@/hooks/useHeroBannerQueries';

import { useAutoplay } from './hooks/useAutoplay';
import { useSwipeGesture } from './hooks/useSwipeGesture';

interface BannerItem {
  id: string | number;
  title: string;
  description?: string;
  poster: string;
  backdrop?: string;
  year?: string;
  rate?: string;
  douban_id?: number;
  type?: string;
  trailerUrl?: string; // 预告片视频URL（可选）
}

interface HeroBannerProps {
  items: BannerItem[];
  autoPlayInterval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  enableVideo?: boolean; // 是否启用视频自动播放
}

// 🚀 优化方案6：使用React.memo防止不必要的重渲染
function HeroBanner({
  items,
  autoPlayInterval = 8000, // Netflix风格：更长的停留时间
  showControls = true,
  showIndicators = true,
  enableVideo = false,
}: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [disabledTrailerIds, setDisabledTrailerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const attemptedRefreshIdsRef = useRef<Set<string>>(new Set());

  // 🚀 TanStack Query - 刷新后的trailer URL缓存
  // 替换 useState + localStorage 手动管理
  const { data: refreshedTrailerUrls = {} } = useRefreshedTrailerUrlsQuery();
  const refreshTrailerMutation = useRefreshTrailerUrlMutation();
  const clearTrailerMutation = useClearTrailerUrlMutation();

  // 处理图片 URL，使用代理绕过防盗链
  const getProxiedImageUrl = (url: string) => {
    if (url?.includes('douban') || url?.includes('doubanio')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // 确保 backdrop 是高清版本
  const getHDBackdrop = (url?: string) => {
    if (!url) return url;
    return url
      .replace('/view/photo/s/', '/view/photo/l/')
      .replace('/view/photo/m/', '/view/photo/l/')
      .replace('/view/photo/sqxs/', '/view/photo/l/')
      .replace('/s_ratio_poster/', '/l_ratio_poster/')
      .replace('/m_ratio_poster/', '/l_ratio_poster/');
  };

  // 处理视频 URL，使用代理绕过防盗链
  const getProxiedVideoUrl = (url: string) => {
    if (url?.includes('douban') || url?.includes('doubanio')) {
      return `/api/video-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // 🚀 TanStack Query - 刷新过期的trailer URL
  // 替换手动 useCallback + setState + localStorage
  const refreshTrailerUrl = useCallback(
    async (doubanId: number | string) => {
      const result = await refreshTrailerMutation.mutateAsync({ doubanId });
      return result;
    },
    [refreshTrailerMutation],
  );

  // 获取当前有效的trailer URL（优先使用刷新后的）
  const getEffectiveTrailerUrl = (item: BannerItem) => {
    if (item.douban_id && disabledTrailerIds.has(String(item.douban_id))) {
      return null;
    }

    if (item.douban_id && refreshedTrailerUrls[item.douban_id]) {
      return refreshedTrailerUrls[item.douban_id];
    }
    return item.trailerUrl;
  };

  // 导航函数
  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setVideoLoaded(false); // 重置视频加载状态
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => setIsTransitioning(false), 800); // Netflix风格：更慢的过渡
  }, [isTransitioning, items.length]);

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setVideoLoaded(false); // 重置视频加载状态
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => setIsTransitioning(false), 800);
  }, [isTransitioning, items.length]);

  const handleIndicatorClick = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setVideoLoaded(false); // 重置视频加载状态
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 800);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // 使用自动轮播 Hook
  useAutoplay({
    currentIndex,
    isHovered,
    autoPlayInterval,
    itemsLength: items.length,
    onNext: handleNext,
  });

  // 使用滑动手势 Hook
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
  });

  // 预加载背景图片（只预加载当前和相邻的图片，优化性能）
  useEffect(() => {
    // 预加载当前、前一张、后一张
    const indicesToPreload = [
      currentIndex,
      (currentIndex - 1 + items.length) % items.length,
      (currentIndex + 1) % items.length,
    ];

    indicesToPreload.forEach((index) => {
      const item = items[index];
      if (item) {
        const img = new window.Image();
        const imageUrl = getHDBackdrop(item.backdrop) || item.poster;
        img.src = getProxiedImageUrl(imageUrl);
      }
    });
  }, [items, currentIndex]);

  const hasItems = items.length > 0;
  const currentItem = hasItems ? items[currentIndex] : null;

  // 🎯 检查并刷新缺失的 trailer URL（组件挂载时）
  useEffect(() => {
    // 如果禁用了视频，不需要刷新 trailer
    if (!enableVideo) {
      return;
    }

    const checkAndRefreshMissingTrailers = async () => {
      if (
        currentItem?.douban_id &&
        !currentItem.trailerUrl &&
        !refreshedTrailerUrls[currentItem.douban_id] &&
        !attemptedRefreshIdsRef.current.has(String(currentItem.douban_id)) &&
        !shouldSkipTrailerRefresh(currentItem.douban_id)
      ) {
        attemptedRefreshIdsRef.current.add(String(currentItem.douban_id));
        await refreshTrailerUrl(currentItem.douban_id);
      }
    };

    // 延迟执行，避免阻塞初始渲染
    const timer = setTimeout(checkAndRefreshMissingTrailers, 1000);
    return () => clearTimeout(timer);
  }, [currentItem, refreshedTrailerUrls, refreshTrailerUrl, enableVideo]);

  if (!hasItems || !currentItem) {
    return null;
  }

  return (
    <div
      className='relative w-full h-[50vh] sm:h-[55vh] md:h-[60vh] overflow-hidden group rounded-[28px]'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...swipeHandlers}
    >
      {/* 背景图片/视频层 */}
      <div className='absolute inset-0'>
        {/* 只渲染当前、前一张、后一张（性能优化） */}
        {items.map((item, index) => {
          // 计算是否应该渲染此项
          const prevIndex = (currentIndex - 1 + items.length) % items.length;
          const nextIndex = (currentIndex + 1) % items.length;
          const shouldRender =
            index === currentIndex ||
            index === prevIndex ||
            index === nextIndex;

          if (!shouldRender) return null;

          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* 背景图片（始终显示，作为视频的占位符） */}
              <Image
                src={getProxiedImageUrl(
                  getHDBackdrop(item.backdrop) || item.poster,
                )}
                alt={item.title}
                fill
                className='object-cover object-center'
                priority={index === 0}
                quality={100}
                sizes='100vw'
                unoptimized={
                  item.backdrop?.includes('/l/') ||
                  item.backdrop?.includes('/l_ratio_poster/') ||
                  false
                }
              />

              {/* 视频背景（如果启用且有预告片URL，加载完成后淡入） */}
              {enableVideo &&
                getEffectiveTrailerUrl(item) &&
                index === currentIndex && (
                  <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                      videoLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    autoPlay
                    muted={isMuted}
                    loop
                    playsInline
                    preload='metadata'
                    onError={async (e) => {
                      const video = e.currentTarget;

                      // 检测是否是403错误（trailer URL过期）
                      if (item.douban_id) {
                        const doubanIdKey = String(item.douban_id);

                        setDisabledTrailerIds((prev) => {
                          const next = new Set(prev);
                          next.add(doubanIdKey);
                          return next;
                        });

                        if (
                          !refreshTrailerMutation.isPending &&
                          !attemptedRefreshIdsRef.current.has(doubanIdKey) &&
                          !shouldSkipTrailerRefresh(item.douban_id)
                        ) {
                          attemptedRefreshIdsRef.current.add(doubanIdKey);

                          // 如果缓存中有URL，说明之前刷新过，但现在又失败了
                          // 需要清除缓存中的旧URL，重新刷新
                          if (refreshedTrailerUrls[item.douban_id]) {
                            clearTrailerMutation.mutate({
                              doubanId: item.douban_id,
                            });
                          }

                          // 重新刷新URL
                          const newUrl = await refreshTrailerUrl(
                            item.douban_id,
                          );
                          if (newUrl) {
                            setDisabledTrailerIds((prev) => {
                              const next = new Set(prev);
                              next.delete(doubanIdKey);
                              return next;
                            });

                            // 重新加载视频
                            video.load();
                          }
                        }
                      }
                    }}
                    onLoadedData={(e) => {
                      setVideoLoaded(true); // 视频加载完成，淡入显示
                      // 确保视频开始播放
                      const video = e.currentTarget;
                      video.play().catch(() => {
                        // 浏览器自动播放限制下静默失败
                      });
                    }}
                  >
                    <source
                      src={getProxiedVideoUrl(
                        getEffectiveTrailerUrl(item) || '',
                      )}
                      type='video/mp4'
                    />
                  </video>
                )}
            </div>
          );
        })}

        <div className='absolute inset-0 bg-gradient-to-t from-black/78 via-black/20 to-black/56' />
      </div>

      {/* 内容叠加层 */}
      <div className='absolute bottom-0 left-0 right-0 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 pb-10 sm:pb-12 md:pb-14 lg:pb-16'>
        <div className='max-w-3xl space-y-3 sm:space-y-4'>
          <h1 className='break-words text-2xl font-bold leading-tight text-white drop-shadow-2xl sm:text-3xl md:text-4xl lg:text-5xl'>
            {currentItem.title}
          </h1>

          {/* 元数据 */}
          <div className='flex items-center gap-3 sm:gap-4 text-sm sm:text-base md:text-lg flex-wrap'>
            {currentItem.rate && (
              <div className='flex items-center gap-1.5 rounded-full border border-[#f4c24d]/24 bg-black/24 px-2.5 py-1 backdrop-blur-[6px]'>
                <span className='font-bold text-[#ffe7a7]'>★</span>
                <span className='font-bold text-white'>{currentItem.rate}</span>
              </div>
            )}
            {currentItem.year && (
              <span className='text-white/90 font-semibold drop-shadow-md'>
                {currentItem.year}
              </span>
            )}
            {currentItem.type && (
              <span className='rounded-full border border-white/12 bg-black/24 px-3 py-1 font-medium text-white/90 backdrop-blur-[6px]'>
                {currentItem.type === 'movie'
                  ? '电影'
                  : currentItem.type === 'tv'
                    ? '剧集'
                    : currentItem.type === 'variety'
                      ? '综艺'
                      : currentItem.type === 'shortdrama'
                        ? '短剧'
                        : currentItem.type === 'anime'
                          ? '动漫'
                          : '剧集'}
              </span>
            )}
          </div>

          {/* 描述 - 限制3行 */}
          {currentItem.description && (
            <p className='max-w-xl line-clamp-2 text-sm leading-relaxed text-white/78 sm:text-base md:text-base lg:text-lg'>
              {currentItem.description}
            </p>
          )}

          {/* 操作按钮 */}
          <div className='flex gap-3 sm:gap-4 pt-2'>
            <Link
              href={
                currentItem.type === 'shortdrama'
                  ? `/play?title=${encodeURIComponent(currentItem.title)}&shortdrama_id=${currentItem.id}`
                  : `/play?title=${encodeURIComponent(currentItem.title)}${currentItem.year ? `&year=${currentItem.year}` : ''}${currentItem.douban_id ? `&douban_id=${currentItem.douban_id}` : ''}${currentItem.type ? `&stype=${currentItem.type}` : ''}`
              }
              className='flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-base font-semibold text-black shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition-all hover:scale-[1.03] hover:bg-white/95 active:scale-95 sm:px-8 sm:py-3 sm:text-lg md:px-10 md:py-4 md:text-xl'
            >
              <Play
                className='w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7'
                fill='currentColor'
              />
              <span>播放</span>
            </Link>
            <Link
              href={
                currentItem.type === 'shortdrama'
                  ? '/shortdrama'
                  : `/douban?type=${
                      currentItem.type === 'variety'
                        ? 'show'
                        : currentItem.type || 'movie'
                    }`
              }
              className='flex items-center gap-2 rounded-full border border-white/16 bg-black/24 px-6 py-2.5 text-base font-semibold text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-[6px] transition-all hover:scale-[1.03] hover:bg-black/32 active:scale-95 sm:px-8 sm:py-3 sm:text-lg md:px-10 md:py-4 md:text-xl'
            >
              <Info className='w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7' />
              <span>更多信息</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 音量控制按钮（仅视频模式） - 底部右下角，避免遮挡简介 */}
      {enableVideo && getEffectiveTrailerUrl(currentItem) && (
        <button
          onClick={toggleMute}
          className='absolute bottom-6 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-black/35 text-white backdrop-blur-sm transition-all hover:bg-black/55 sm:bottom-8 sm:right-8 sm:h-12 sm:w-12 md:right-12 lg:right-16'
          aria-label={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? (
            <VolumeX className='w-5 h-5 sm:w-6 sm:h-6' />
          ) : (
            <Volume2 className='w-5 h-5 sm:w-6 sm:h-6' />
          )}
        </button>
      )}

      {/* 导航按钮 - 桌面端显示 */}
      {showControls && items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className='absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-black/35 text-white opacity-0 backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/55 group-hover:opacity-100 md:flex lg:left-8 lg:h-14 lg:w-14'
            aria-label='上一张'
          >
            <ChevronLeft className='w-7 h-7 lg:w-8 lg:h-8' />
          </button>
          <button
            onClick={handleNext}
            className='absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-black/35 text-white opacity-0 backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/55 group-hover:opacity-100 md:flex lg:right-8 lg:h-14 lg:w-14'
            aria-label='下一张'
          >
            <ChevronRight className='w-7 h-7 lg:w-8 lg:h-8' />
          </button>
        </>
      )}

      {/* 指示器 - Netflix风格：底部居中 */}
      {showIndicators && items.length > 1 && (
        <div className='absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-sm sm:bottom-6'>
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => handleIndicatorClick(index)}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 sm:w-10 bg-white shadow-lg'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`跳转到第 ${index + 1} 张`}
            />
          ))}
        </div>
      )}

      <div className='absolute right-4 top-4 sm:right-8 sm:top-6 md:right-12 md:top-8'>
        <div className='rounded-full border border-white/16 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:text-sm'>
          {currentIndex + 1} / {items.length}
        </div>
      </div>
    </div>
  );
}

export default memo(HeroBanner);
