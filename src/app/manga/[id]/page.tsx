'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronRight,
  Loader2,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import type { MangaDetail } from '@/lib/manga';

import PageLayout from '@/components/PageLayout';

export default function MangaDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const source = searchParams.get('source') || 'mangabz';
  const mangaId = decodeURIComponent(params.id as string);

  const [showAllChapters, setShowAllChapters] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['manga', 'detail', mangaId, source],
    queryFn: async () => {
      const res = await fetch(
        `/api/manga/detail?id=${encodeURIComponent(mangaId)}&source=${source}`,
      );
      if (!res.ok) return null;
      return (await res.json()) as MangaDetail;
    },
    staleTime: 300_000,
  });

  if (isLoading) {
    return (
      <PageLayout activePath='/manga'>
        <div className='flex items-center justify-center py-20'>
          <div className='text-center'>
            <Loader2 className='mx-auto h-10 w-10 animate-spin text-green-500 dark:text-green-400' />
            <p className='mt-4 text-sm text-gray-600 dark:text-gray-400'>
              正在加载漫画详情...
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!detail) {
    return (
      <PageLayout activePath='/manga'>
        <div className='flex flex-col items-center justify-center py-20'>
          <BookOpen className='w-16 h-16 text-gray-300 dark:text-gray-600' />
          <h3 className='mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300'>
            未找到漫画信息
          </h3>
          <Link
            href='/manga'
            className='mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors'
          >
            返回搜索
          </Link>
        </div>
      </PageLayout>
    );
  }

  const chaptersToShow = showAllChapters
    ? detail.chapters
    : detail.chapters.slice(0, 50);

  return (
    <PageLayout activePath='/manga'>
      <div className='min-h-screen -mt-6 md:mt-0'>
        {/* Back Button */}
        <Link
          href='/manga'
          className='inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors mb-6'
        >
          <ArrowLeft className='w-4 h-4' />
          返回搜索
        </Link>

        {/* Manga Info Section */}
        <div className='flex flex-col sm:flex-row gap-6 mb-8'>
          {/* Cover */}
          <div className='shrink-0 w-40 sm:w-48 mx-auto sm:mx-0'>
            <div className='aspect-[3/4] relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 shadow-lg'>
              {detail.cover ? (
                <img
                  src={`/api/image-proxy?url=${encodeURIComponent(detail.cover)}`}
                  alt={detail.title}
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='flex items-center justify-center h-full'>
                  <BookOpen className='w-16 h-16 text-gray-300 dark:text-gray-600' />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className='flex-1 min-w-0'>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3'>
              {detail.title}
            </h1>

            <div className='flex flex-wrap gap-3 mb-4'>
              {detail.author && detail.author !== '未知' && (
                <div className='flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400'>
                  <User className='w-4 h-4' />
                  {detail.author}
                </div>
              )}
              {detail.status && detail.status !== '未知' && (
                <div className='flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400'>
                  <Calendar className='w-4 h-4' />
                  {detail.status}
                </div>
              )}
              <div className='px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium'>
                {detail.sourceName}
              </div>
            </div>

            {detail.description && (
              <p className='text-sm leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-6 mb-4'>
                {detail.description}
              </p>
            )}

            <div className='text-sm text-gray-500 dark:text-gray-500'>
              共 {detail.chapters.length} 章
            </div>
          </div>
        </div>

        {/* Chapter List */}
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
              章节列表
            </h2>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              {detail.chapters.length} 章
            </span>
          </div>

          <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2'>
            {chaptersToShow.map((chapter, index) => (
              <Link
                key={`${chapter.id}-${index}`}
                href={`/manga/read?url=${encodeURIComponent(chapter.url)}&source=${chapter.source}&title=${encodeURIComponent(detail.title)}`}
                className='group flex items-center justify-center px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 text-center'
              >
                <span className='text-sm text-gray-700 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 truncate transition-colors'>
                  {chapter.title}
                </span>
              </Link>
            ))}
          </div>

          {detail.chapters.length > 50 && !showAllChapters && (
            <button
              onClick={() => setShowAllChapters(true)}
              className='w-full mt-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400'
            >
              展开全部 {detail.chapters.length} 章
              <ChevronRight className='w-4 h-4' />
            </button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
