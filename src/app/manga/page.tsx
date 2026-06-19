'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronUp, Search, Star, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import type { MangaSearchResult } from '@/lib/manga';

import PageLayout from '@/components/PageLayout';
import { PanelField } from '@/components/ui-surface';

function MangaSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const trimmedQuery = initialQuery.trim();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['manga', 'search', trimmedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/manga/search?q=${encodeURIComponent(trimmedQuery)}&page=1`,
      );
      const json = await res.json();
      return (json.results || []) as MangaSearchResult[];
    },
    enabled: !!trimmedQuery,
    staleTime: 60_000,
  });

  const results = data || [];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setShowBackToTop(scrollTop > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    router.push(`/manga?q=${encodeURIComponent(trimmed)}`);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PageLayout activePath='/manga'>
      <div className='min-h-screen -mt-6 md:mt-0'>
        {/* Page Header */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            漫画频道
          </h1>
          <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
            搜索并阅读来自多个源的漫画
          </p>
        </div>

        {/* Search Bar */}
        <div className='mb-8'>
          <form onSubmit={handleSearch} className='relative group'>
            <Search className='absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-all duration-300 group-focus-within:text-green-500 dark:group-focus-within:text-green-400 group-focus-within:scale-110' />
            <PanelField
              type='text'
              placeholder='搜索漫画名称...'
              className='pl-12 pr-4 h-12'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => {
                  setSearchQuery('');
                  router.replace('/manga');
                }}
                className='absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200/80 text-gray-500 shadow-sm transition-all duration-300 hover:bg-red-500 hover:text-white dark:bg-gray-700/80 dark:text-gray-400 dark:hover:bg-red-600'
                aria-label='清除搜索内容'
              >
                <X className='h-4 w-4' />
              </button>
            )}
          </form>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className='flex items-center justify-center py-20'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-10 w-10 border-3 border-gray-300 border-t-green-500 dark:border-gray-600 dark:border-t-green-400 mx-auto' />
              <p className='mt-4 text-sm text-gray-600 dark:text-gray-400'>
                正在搜索漫画...
              </p>
            </div>
          </div>
        )}

        {/* Empty State - Show Popular Manga */}
        {!trimmedQuery && !isLoading && (
          <div>
            {/* Popular Manga Section */}
            <div className='mb-8'>
              <h2 className='text-lg font-bold text-gray-900 dark:text-white mb-4'>
                热门漫画
              </h2>
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
                {[
                  {
                    id: '139',
                    title: '海贼王',
                    source: 'mangabz',
                    cover:
                      'https://cover.mangabz.com/1/139/20191203153434_180x240_26.jpg',
                  },
                  {
                    id: '1',
                    title: '一拳超人',
                    source: 'mangabz',
                    cover:
                      'https://cover.mangabz.com/1/1/20190228151547_180x240_46.jpg',
                  },
                  {
                    id: '2',
                    title: '鬼灭之刃',
                    source: 'mangabz',
                    cover:
                      'https://cover.mangabz.com/2/2/20190304183026_180x240_25.jpg',
                  },
                  {
                    id: '3',
                    title: '咒术回战',
                    source: 'mangabz',
                    cover:
                      'https://cover.mangabz.com/3/3/20190304183422_180x240_96.jpg',
                  },
                  {
                    id: '4',
                    title: '进击的巨人',
                    source: 'mangabz',
                    cover:
                      'https://cover.mangabz.com/4/4/20190228150959_180x240_68.jpg',
                  },
                  {
                    id: '5',
                    title: '我的英雄学院',
                    source: 'mangabz',
                    cover:
                      'https://cover.mangabz.com/5/5/20190228151803_180x240_13.jpg',
                  },
                ].map((manga) => (
                  <Link
                    key={manga.id}
                    href={`/manga/${manga.id}?source=${manga.source}`}
                    className='group'
                  >
                    <div className='relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100 dark:border-gray-800'>
                      <div className='aspect-[3/4] relative overflow-hidden bg-gray-100 dark:bg-gray-800'>
                        <img
                          src={`/api/image-proxy?url=${encodeURIComponent(manga.cover)}`}
                          alt={manga.title}
                          className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                          loading='lazy'
                        />
                      </div>
                      <div className='p-3'>
                        <h3 className='text-sm font-semibold text-gray-900 dark:text-white line-clamp-1'>
                          {manga.title}
                        </h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Search Prompt */}
            <div className='flex flex-col items-center justify-center py-10'>
              <div className='relative'>
                <div className='w-20 h-20 rounded-full bg-linear-to-br from-gray-100 to-slate-200 dark:from-gray-800 dark:to-slate-700 flex items-center justify-center shadow-lg'>
                  <BookOpen className='w-10 h-10 text-gray-400 dark:text-gray-500' />
                </div>
                <div className='absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping' />
              </div>
              <h3 className='mt-4 text-lg font-bold text-gray-800 dark:text-gray-200'>
                搜索更多漫画
              </h3>
              <p className='mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-xs text-center'>
                支持 MangaBZ 等多个漫画源
              </p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && trimmedQuery && results.length === 0 && (
          <div className='flex flex-col items-center justify-center py-20'>
            <div className='w-24 h-24 rounded-full bg-linear-to-br from-gray-100 to-slate-200 dark:from-gray-800 dark:to-slate-700 flex items-center justify-center shadow-lg'>
              <Search className='w-12 h-12 text-gray-400 dark:text-gray-500' />
            </div>
            <h3 className='mt-6 text-xl font-bold text-gray-800 dark:text-gray-200'>
              未找到相关漫画
            </h3>
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-xs text-center'>
              换个关键词试试吧
            </p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && results.length > 0 && (
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
            {results.map((item, index) => (
              <Link
                key={`${item.source}-${item.id}-${index}`}
                href={`/manga/${encodeURIComponent(item.id)}?source=${item.source}`}
                className='group'
              >
                <div className='relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100 dark:border-gray-800'>
                  {/* Cover Image */}
                  <div className='aspect-[3/4] relative overflow-hidden bg-gray-100 dark:bg-gray-800'>
                    {item.cover ? (
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(item.cover)}`}
                        alt={item.title}
                        className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
                        loading='lazy'
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (
                            parent &&
                            !parent.querySelector('.fallback-icon')
                          ) {
                            const fallback = document.createElement('div');
                            fallback.className =
                              'fallback-icon w-full h-full flex items-center justify-center';
                            fallback.innerHTML =
                              '<svg class="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className='flex items-center justify-center h-full'>
                        <BookOpen className='w-12 h-12 text-gray-300 dark:text-gray-600' />
                      </div>
                    )}

                    {/* Source Badge */}
                    <div className='absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm'>
                      {item.sourceName}
                    </div>

                    {/* Status Badge */}
                    {item.status && item.status !== '未知' && (
                      <div className='absolute top-2 right-2 px-2 py-0.5 rounded-full bg-green-500/80 text-white text-[10px] font-medium backdrop-blur-sm'>
                        {item.status}
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                  </div>

                  {/* Info */}
                  <div className='p-3'>
                    <h3 className='line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors'>
                      {item.title}
                    </h3>
                    {item.author && item.author !== '未知' && (
                      <p className='mt-1 text-xs text-gray-500 dark:text-gray-400 truncate'>
                        {item.author}
                      </p>
                    )}
                    {item.latestChapter && (
                      <div className='mt-2 flex items-center gap-1'>
                        <Star className='w-3 h-3 text-amber-400 fill-amber-400' />
                        <span className='text-xs text-amber-600 dark:text-amber-400 truncate'>
                          {item.latestChapter}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Loading More Indicator */}
        {isFetching && !isLoading && (
          <div className='flex justify-center mt-8'>
            <div className='flex items-center gap-3 px-6 py-3 bg-white/70 dark:bg-white/6 rounded-full border border-black/6 dark:border-white/8 shadow-md backdrop-blur-md'>
              <div className='animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-green-500 dark:border-gray-600 dark:border-t-green-400' />
              <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                加载更多漫画...
              </span>
            </div>
          </div>
        )}

        {/* Scroll to top button */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-20 md:bottom-6 right-6 z-500 w-12 h-12 bg-green-500/90 hover:bg-green-500 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out flex items-center justify-center group ${
            showBackToTop
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
          aria-label='返回顶部'
        >
          <ChevronUp className='w-6 h-6 transition-transform group-hover:scale-110' />
        </button>
      </div>
    </PageLayout>
  );
}

export default function MangaSearchPage() {
  return (
    <Suspense
      fallback={
        <PageLayout activePath='/manga'>
          <div className='flex items-center justify-center py-20'>
            <div className='animate-spin rounded-full h-10 w-10 border-3 border-gray-300 border-t-green-500 dark:border-gray-600 dark:border-t-green-400' />
          </div>
        </PageLayout>
      }
    >
      <MangaSearchContent />
    </Suspense>
  );
}
