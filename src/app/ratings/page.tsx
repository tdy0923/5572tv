'use client';

import { useQuery } from '@tanstack/react-query';
import { Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { FluentSpinner } from '@/components/FluentSpinner';
import PageLayout from '@/components/PageLayout';

interface RatingEntry {
  videoId: string;
  videoSource: string;
  title: string;
  poster?: string;
  avgRating: number;
  count: number;
}

const RATINGS_OPTIONS = {
  queryKey: ['ratings', 'leaderboard'],
  queryFn: async (): Promise<RatingEntry[]> => {
    const res = await fetch('/api/reviews/leaderboard');
    if (!res.ok) return [];
    const data = await res.json();
    return data.list || [];
  },
  staleTime: 5 * 60 * 1000,
};

export default function RatingsPage() {
  const { data: list = [], isLoading } = useQuery(RATINGS_OPTIONS);
  const [minVotes, setMinVotes] = useState(1);

  const filtered = list.filter((item) => item.count >= minVotes);

  return (
    <PageLayout activePath='/ratings'>
      <div className='mx-auto max-w-5xl'>
        {/* 标题 */}
        <div className='mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <TrendingUp className='h-5 w-5 text-primary-500' />
              <h1 className='text-xl font-bold text-gray-900 dark:text-white sm:text-2xl'>
                评分排行榜
              </h1>
            </div>
            <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
              用户实时评分，发现高分佳作
            </p>
          </div>

          {/* 最少投票筛选 */}
          <div className='flex items-center gap-2'>
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              至少
            </span>
            <select
              value={minVotes}
              onChange={(e) => setMinVotes(Number(e.target.value))}
              className='ui-input h-9 w-20 text-sm'
            >
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n} 票
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className='flex justify-center py-20'>
            <FluentSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className='ui-surface py-20 text-center text-sm text-gray-500 dark:text-gray-400'>
            暂无评分数据，去观看影片并评分吧
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5'>
            {filtered.map((item, index) => (
              <Link
                key={`${item.videoSource}-${item.videoId}`}
                href={`/play?source=${encodeURIComponent(item.videoSource)}&id=${encodeURIComponent(item.videoId)}&title=${encodeURIComponent(item.title)}`}
                className='group relative block'
              >
                {/* 排名角标 */}
                <div
                  className={`absolute -top-1 -left-1 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold shadow-md ${
                    index === 0
                      ? 'bg-linear-to-br from-primary-400 to-primary-600 text-gray-950'
                      : index === 1
                        ? 'bg-gray-300 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                        : index === 2
                          ? 'bg-amber-700/80 text-amber-100'
                          : 'bg-gray-800/80 text-gray-200 backdrop-blur'
                  }`}
                >
                  {index + 1}
                </div>

                {/* 海报 */}
                <div className='relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800'>
                  {item.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.poster}
                      alt={item.title}
                      loading='lazy'
                      className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          'none';
                      }}
                    />
                  ) : (
                    <div className='flex h-full w-full items-center justify-center p-3 text-center'>
                      <span className='text-xs text-gray-500 line-clamp-3'>
                        {item.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className='mt-2'>
                  <p className='truncate text-sm font-medium text-gray-800 dark:text-gray-200'>
                    {item.title}
                  </p>
                  <div className='mt-0.5 flex items-center gap-1'>
                    <Star className='h-3.5 w-3.5 fill-primary-500 text-primary-500' />
                    <span className='text-sm font-semibold text-primary-600 dark:text-primary-400'>
                      {item.avgRating.toFixed(1)}
                    </span>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {item.count} 票
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
