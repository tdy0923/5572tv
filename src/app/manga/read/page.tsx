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

  const [readMode, setReadMode] = useState<ReadMode>('vertical');
  const [currentPage, setCurrentPage] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Set<number>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

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
    setCurrentPage(0);
  }, [chapterUrl]);

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
      saveReadingProgress(chapterUrl, progress);
    }
  }, [currentPage, chapterUrl, totalPages, readMode]);

  // Add to history
  useEffect(() => {
    if (chapterData?.title && mangaTitle) {
      addToMangaHistory(mangaTitle, chapterData.title, pages[0]?.url || '');
    }
  }, [chapterData?.title, mangaTitle, pages]);

  // Vertical scroll progress tracking
  useEffect(() => {
    if (readMode !== 'vertical' || !containerRef.current) return;

    const container = containerRef.current;
    const handleScroll = () => {
      const progress = Math.floor(
        (container.scrollTop /
          (container.scrollHeight - container.clientHeight)) *
          totalPages,
      );
      const clampedProgress = Math.max(0, Math.min(progress, totalPages - 1));
      saveReadingProgress(chapterUrl, clampedProgress);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [readMode, chapterUrl, totalPages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readMode !== 'horizontal') return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPage((p) => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readMode, totalPages]);

  // Touch swipe for horizontal mode
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (readMode !== 'horizontal') return;
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
        } else {
          setCurrentPage((p) => Math.max(0, p - 1));
        }
      }
    },
    [readMode, totalPages],
  );

  const handleImageLoad = useCallback((index: number) => {
    setImagesLoaded((prev) => new Set(prev).add(index));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  if (!chapterUrl) {
    return (
      <PageLayout activePath='/manga'>
        <div className='flex flex-col items-center justify-center py-20'>
          <BookOpen className='w-16 h-16 text-gray-300 dark:text-gray-600' />
          <h3 className='mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300'>
            未指定章节
          </h3>
        </div>
      </PageLayout>
    );
  }

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
      {/* Top Bar */}
      <div className='sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 -mx-3 sm:-mx-5 md:-mx-6 lg:-mx-8 px-3 sm:px-5 md:px-6 lg:px-8 py-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3 min-w-0'>
            <Link
              href='/manga'
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

          <div className='flex items-center gap-1'>
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
                <div className='mt-2 flex gap-2'>
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
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.classList.add('hidden');
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.error-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className =
                      'error-fallback w-full max-w-[800px] aspect-[2/3] flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400';
                    fallback.innerHTML =
                      '<svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-sm">图片加载失败</span>';
                    parent.appendChild(fallback);
                  }
                }}
              />
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
                />
              </>
            )}

            {/* Navigation Areas */}
            {currentPage > 0 && (
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className='absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity'
                aria-label='上一页'
              >
                <div className='p-2 rounded-full bg-black/30 backdrop-blur-sm'>
                  <ChevronLeft className='w-6 h-6 text-white' />
                </div>
              </button>
            )}
            {currentPage < totalPages - 1 && (
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                }
                className='absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity'
                aria-label='下一页'
              >
                <div className='p-2 rounded-full bg-black/30 backdrop-blur-sm'>
                  <ChevronRight className='w-6 h-6 text-white' />
                </div>
              </button>
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
