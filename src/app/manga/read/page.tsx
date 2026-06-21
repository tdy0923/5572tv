/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize,
  Minimize,
  Settings,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { MangaChapterPages } from '@/lib/manga';

import PageLayout from '@/components/PageLayout';

type ReadMode = 'vertical' | 'horizontal';

function getReadingProgress(chapterUrl: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const saved = localStorage.getItem(`manga-progress:${chapterUrl}`);
    return saved ? parseInt(saved, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveReadingProgress(chapterUrl: string, index: number): void {
  try {
    localStorage.setItem(`manga-progress:${chapterUrl}`, String(index));
  } catch {
    // ignore
  }
}

function getSavedReadMode(): ReadMode {
  if (typeof window === 'undefined') return 'vertical';
  try {
    const saved = localStorage.getItem('manga-read-mode');
    if (saved === 'horizontal' || saved === 'vertical') return saved;
  } catch {
    // ignore
  }
  return 'vertical';
}

function saveReadMode(mode: ReadMode): void {
  try {
    localStorage.setItem('manga-read-mode', mode);
  } catch {
    // ignore
  }
}

function addToMangaHistory(
  title: string,
  chapter: string,
  cover: string,
): void {
  try {
    const historyKey = 'manga-history';
    const saved = localStorage.getItem(historyKey);
    const history: Array<{
      title: string;
      chapter: string;
      cover: string;
      time: number;
    }> = saved ? JSON.parse(saved) : [];

    const existing = history.findIndex((h) => h.title === title);
    if (existing >= 0) {
      history[existing] = { title, chapter, cover, time: Date.now() };
    } else {
      history.unshift({ title, chapter, cover, time: Date.now() });
    }

    if (history.length > 50) {
      history.splice(50);
    }

    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export default function MangaReaderPage() {
  const searchParams = useSearchParams();
  const chapterUrl = searchParams.get('url') || '';
  const source = searchParams.get('source') || 'mangabz';
  const mangaTitle = searchParams.get('title') || '未知漫画';

  const [readMode, setReadMode] = useState<ReadMode>(getSavedReadMode);
  const [currentPage, setCurrentPage] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());
  const [imagesFailed, setImagesFailed] = useState<Set<number>>(new Set());
  const [showControls, setShowControls] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const { data: chapterData, isLoading } = useQuery({
    queryKey: ['manga', 'chapter', chapterUrl, source],
    queryFn: async () => {
      const res = await fetch(
        `/api/manga/chapter?url=${encodeURIComponent(chapterUrl)}&source=${source}`,
      );
      if (!res.ok) return null;
      return (await res.json()) as MangaChapterPages;
    },
    enabled: !!chapterUrl,
    staleTime: 600_000,
  });

  const pages = chapterData?.pages || [];
  const totalPages = pages.length;
  const chapterUrlDirect = chapterData?.chapterUrl || '';

  // Reset imagesLoaded when chapter changes
  useEffect(() => {
    setImagesLoaded(new Set());
    setImagesFailed(new Set());
    setCurrentPage(0);
  }, [chapterUrl]);

  // Save reading mode preference
  useEffect(() => {
    saveReadMode(readMode);
  }, [readMode]);

  // Load saved reading progress
  useEffect(() => {
    if (chapterUrl && totalPages > 0) {
      const savedProgress = getReadingProgress(chapterUrl);
      if (savedProgress > 0 && savedProgress < totalPages) {
        if (readMode === 'horizontal') {
          setCurrentPage(savedProgress);
        } else {
          // For vertical mode, scroll to saved position
          const timer = setTimeout(() => {
            const container = containerRef.current;
            if (container) {
              const targetScroll =
                (savedProgress / totalPages) * container.scrollHeight;
              container.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [chapterUrl, totalPages, readMode]);

  // Save reading progress on page change
  useEffect(() => {
    if (chapterUrl && totalPages > 0) {
      const progress =
        readMode === 'horizontal'
          ? currentPage
          : Math.floor(
              ((containerRef.current?.scrollTop || 0) /
                (containerRef.current?.scrollHeight || 1)) *
                totalPages,
            );
      if (progress >= 0) {
        saveReadingProgress(chapterUrl, progress);
      }
    }
  }, [chapterUrl, currentPage, readMode, totalPages]);

  // Add to history
  useEffect(() => {
    if (chapterData?.title && mangaTitle) {
      addToMangaHistory(mangaTitle, chapterData.title, pages[0]?.url || '');
    }
  }, [chapterData?.title, mangaTitle, pages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readMode !== 'horizontal') return;

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setCurrentPage((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
      } else if (e.key === 'Escape') {
        setShowSettings(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readMode, totalPages]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (readMode !== 'horizontal') return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only handle horizontal swipes (ignore vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - previous page
        setCurrentPage((p) => Math.max(0, p - 1));
      } else {
        // Swipe left - next page
        setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
      }
    }
  };

  // Toggle controls visibility
  const toggleControls = () => {
    setShowControls((prev) => !prev);
  };

  // Image load handler
  const handleImageLoad = useCallback((index: number) => {
    setImagesLoaded((prev) => new Set(prev).add(index));
  }, []);

  // Image error handler
  const handleImageError = useCallback((index: number) => {
    setImagesFailed((prev) => new Set(prev).add(index));
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (readMode !== 'horizontal' || !showControls) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [readMode, showControls, currentPage]);

  if (isLoading) {
    return (
      <PageLayout activePath='/manga'>
        <div className='flex items-center justify-center py-20'>
          <div className='text-center'>
            <Loader2 className='mx-auto h-10 w-10 animate-spin text-green-500 dark:text-green-400' />
            <p className='mt-4 text-sm text-gray-600 dark:text-gray-400'>
              正在加载章节内容...
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!chapterData || pages.length === 0) {
    return (
      <PageLayout activePath='/manga'>
        <div className='flex flex-col items-center justify-center py-20'>
          <BookOpen className='w-16 h-16 text-gray-300 dark:text-gray-600' />
          <h3 className='mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300'>
            章节内容需要在源站查看
          </h3>
          <p className='mt-2 text-sm text-gray-500 dark:text-gray-400 text-center max-w-md'>
            由于源站反爬机制，此章节的图片无法直接加载。
            <br />
            请点击下方按钮在源站阅读。
          </p>
          {chapterUrlDirect && (
            <a
              href={chapterUrlDirect}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-4 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium'
            >
              在源站阅读
            </a>
          )}
          <Link
            href={`/manga/${encodeURIComponent(searchParams.get('id') || '')}?source=${source}`}
            className='mt-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          >
            返回章节列表
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePath='/manga'>
      {/* Top Bar - Auto-hide in horizontal mode */}
      <div
        className={`sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 -mx-3 sm:-mx-5 md:-mx-6 lg:-mx-8 px-3 sm:px-5 md:px-6 lg:px-8 py-3 transition-all duration-300 ${
          readMode === 'horizontal' && !showControls
            ? '-translate-y-full opacity-0'
            : ''
        }`}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3 min-w-0'>
            <Link
              href={
                searchParams.get('id')
                  ? `/manga/${encodeURIComponent(searchParams.get('id')!)}?source=${source}`
                  : '/manga'
              }
              className='shrink-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            >
              <ArrowLeft className='w-5 h-5 text-gray-600 dark:text-gray-400' />
            </Link>
            <div className='min-w-0'>
              <h1 className='text-sm font-semibold text-gray-900 dark:text-white truncate'>
                {mangaTitle}
              </h1>
              <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                {chapterData.title}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            {/* Page Progress */}
            <span className='text-xs text-gray-500 dark:text-gray-400 hidden sm:inline'>
              {readMode === 'horizontal'
                ? `${currentPage + 1}/${totalPages}`
                : `${imagesLoaded.size}/${totalPages} 已加载`}
            </span>

            {/* Read Mode Toggle */}
            <button
              onClick={() =>
                setReadMode((m) =>
                  m === 'vertical' ? 'horizontal' : 'vertical',
                )
              }
              className='px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
            >
              {readMode === 'vertical' ? '纵向' : '横向'}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            >
              {isFullscreen ? (
                <Minimize className='w-5 h-5 text-gray-600 dark:text-gray-400' />
              ) : (
                <Maximize className='w-5 h-5 text-gray-600 dark:text-gray-400' />
              )}
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            >
              <Settings className='w-5 h-5 text-gray-600 dark:text-gray-400' />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className='mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
          <div
            className='h-full bg-green-500 transition-all duration-300'
            style={{
              width: `${totalPages > 0 ? (readMode === 'horizontal' ? ((currentPage + 1) / totalPages) * 100 : (imagesLoaded.size / totalPages) * 100) : 0}%`,
            }}
          />
        </div>

        {/* Horizontal Mode: Page Slider */}
        {readMode === 'horizontal' && (
          <div className='mt-2 flex items-center gap-3'>
            <span className='text-xs text-gray-500 dark:text-gray-400 shrink-0'>
              {currentPage + 1}/{totalPages}
            </span>
            <input
              type='range'
              min={0}
              max={totalPages - 1}
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value))}
              className='flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-500'
            />
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className='fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                阅读设置
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
              >
                <X className='w-5 h-5 text-gray-500' />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  阅读模式
                </label>
                <div className='flex gap-2 mt-2'>
                  <button
                    onClick={() => setReadMode('vertical')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      readMode === 'vertical'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    纵向滚动
                  </button>
                  <button
                    onClick={() => setReadMode('horizontal')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      readMode === 'horizontal'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    横向翻页
                  </button>
                </div>
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  图片已加载: {imagesLoaded.size}/{totalPages}
                </label>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className='w-full mt-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors'
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* Reading Content */}
      {readMode === 'vertical' ? (
        /* Vertical Scroll Mode */
        <div
          ref={containerRef}
          className='flex flex-col items-center gap-0 py-4 -mx-3 sm:-mx-5 md:-mx-6 lg:-mx-8'
        >
          {pages.map((page, index) => (
            <div
              key={`${page.url}-${index}`}
              className='w-full flex justify-center bg-gray-50 dark:bg-gray-950'
            >
              {!imagesLoaded.has(index) && (
                <div className='w-full max-w-[800px] aspect-[2/3] flex items-center justify-center bg-gray-100 dark:bg-gray-900'>
                  <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
                </div>
              )}
              <img
                src={`/api/image-proxy?url=${encodeURIComponent(page.url)}`}
                alt={`Page ${index + 1}`}
                className={`w-full max-w-[800px] object-contain ${imagesLoaded.has(index) ? '' : 'hidden'}`}
                loading={index < 3 ? 'eager' : 'lazy'}
                onLoad={() => handleImageLoad(index)}
                onError={() => handleImageError(index)}
              />
              {imagesFailed.has(index) && (
                <div className='w-full max-w-[800px] aspect-[2/3] flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400'>
                  <svg
                    className='w-12 h-12 mb-2'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                    />
                  </svg>
                  <span className='text-sm'>图片加载失败</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Horizontal Page Flip Mode */
        <div
          ref={pageContainerRef}
          className='flex flex-col items-center justify-center min-h-[70vh] py-4 -mx-3 sm:-mx-5 md:-mx-6 lg:-mx-8'
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={toggleControls}
        >
          <div className='relative w-full max-w-[800px]'>
            {pages[currentPage] && (
              <>
                {!imagesLoaded.has(currentPage) && (
                  <div className='w-full aspect-[2/3] flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg'>
                    <Loader2 className='w-10 h-10 animate-spin text-gray-400' />
                  </div>
                )}
                <img
                  src={`/api/image-proxy?url=${encodeURIComponent(pages[currentPage].url)}`}
                  alt={`Page ${currentPage + 1}`}
                  className={`w-full object-contain rounded-lg ${imagesLoaded.has(currentPage) ? '' : 'hidden'}`}
                  loading='eager'
                  onLoad={() => handleImageLoad(currentPage)}
                  onError={() => handleImageError(currentPage)}
                />
                {imagesFailed.has(currentPage) && (
                  <div className='w-full aspect-[2/3] flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg text-gray-500 dark:text-gray-400'>
                    <svg
                      className='w-12 h-12 mb-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                      />
                    </svg>
                    <span className='text-sm'>图片加载失败</span>
                  </div>
                )}
              </>
            )}

            {/* Always-visible Navigation Areas */}
            {currentPage > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPage((p) => Math.max(0, p - 1));
                }}
                className='absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-4 z-10'
                aria-label='上一页'
              >
                <div className='p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors'>
                  <ChevronLeft className='w-8 h-8 text-white' />
                </div>
              </button>
            )}
            {currentPage < totalPages - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
                }}
                className='absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-4 z-10'
                aria-label='下一页'
              >
                <div className='p-3 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors'>
                  <ChevronRight className='w-8 h-8 text-white' />
                </div>
              </button>
            )}

            {/* Last page prompt - show next chapter button */}
            {currentPage === totalPages - 1 && chapterData.nextChapterId && (
              <div className='absolute bottom-20 left-1/2 -translate-x-1/2 z-20'>
                <Link
                  href={`/manga/read?url=${encodeURIComponent(chapterData.nextChapterId)}&source=${source}&title=${encodeURIComponent(mangaTitle)}`}
                  className='flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-medium shadow-lg'
                >
                  下一章
                  <ArrowRight className='w-4 h-4' />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className='sticky bottom-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50 -mx-3 sm:-mx-5 md:-mx-6 lg:-mx-8 px-3 sm:px-5 md:px-6 lg:px-8 py-3'>
        <div className='flex items-center justify-between gap-4'>
          {/* Prev Chapter */}
          {chapterData.prevChapterId ? (
            <Link
              href={`/manga/read?url=${encodeURIComponent(chapterData.prevChapterId)}&source=${source}&title=${encodeURIComponent(mangaTitle)}`}
              className='flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium'
            >
              <ArrowLeft className='w-4 h-4' />
              上一章
            </Link>
          ) : (
            <div />
          )}

          {/* Page Info */}
          {readMode === 'horizontal' && (
            <div className='text-sm text-gray-500 dark:text-gray-400 text-center'>
              {currentPage + 1} / {totalPages}
            </div>
          )}

          {/* Next Chapter */}
          {chapterData.nextChapterId ? (
            <Link
              href={`/manga/read?url=${encodeURIComponent(chapterData.nextChapterId)}&source=${source}&title=${encodeURIComponent(mangaTitle)}`}
              className='flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-medium'
            >
              下一章
              <ArrowRight className='w-4 h-4' />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
