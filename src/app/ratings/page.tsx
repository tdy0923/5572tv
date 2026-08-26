'use client';

import { useQuery } from '@tanstack/react-query';
import { Flame, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import PageLayout from '@/components/PageLayout';
import PosterGridSkeleton from '@/components/PosterGridSkeleton';

interface RatingEntry {
  videoId: string;
  videoSource: string;
  title: string;
  poster?: string;
  avgRating: number;
  count: number;
  type?: string;
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

const DOUBAN_HIGH_OPTIONS = (type: string) => ({
  queryKey: ['ratings', 'douban-high', type],
  queryFn: async (): Promise<RatingEntry[]> => {
    const res = await fetch(
      `/api/douban?type=${type}&tag=豆瓣高分&page=0&pageSize=12`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    // 响应结构: { ok: true, data: { subjects: [...] } }
    const raw = json?.data ?? json;
    const subjects = Array.isArray(raw?.subjects)
      ? raw.subjects
      : Array.isArray(raw?.list)
        ? raw.list
        : [];
    return subjects.map((s: any) => ({
      videoId: String(s.id || ''),
      videoSource: 'douban',
      title: String(s.title || ''),
      poster: s.cover || s.poster || '',
      avgRating: Number(s.rate || s.rating?.value || 0),
      count: 0,
      type,
    }));
  },
  staleTime: 10 * 60 * 1000,
});

function RatingCard({
  item,
  index,
  showRank = false,
}: {
  item: RatingEntry;
  index: number;
  showRank?: boolean;
}) {
  // 用户评分 → 播放页（带 source+id）；豆瓣精选 → 播放页（带 douban_id+stype）
  const href =
    item.videoSource === 'douban'
      ? `/play?title=${encodeURIComponent(item.title)}&douban_id=${encodeURIComponent(item.videoId)}&stype=${item.type || 'movie'}`
      : `/play?source=${encodeURIComponent(item.videoSource)}&id=${encodeURIComponent(item.videoId)}&title=${encodeURIComponent(item.title)}`;
  return (
    <Link href={href} className='group relative block'>
      {showRank && (
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
      )}

      <div className='relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800'>
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading='lazy'
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
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

      <div className='mt-2'>
        <p className='truncate text-sm font-medium text-gray-800 dark:text-gray-200'>
          {item.title}
        </p>
        <div className='mt-0.5 flex items-center gap-1'>
          <Star className='h-3.5 w-3.5 fill-primary-500 text-primary-500' />
          <span className='text-sm font-semibold text-primary-600 dark:text-primary-400'>
            {item.avgRating.toFixed(1)}
          </span>
          {item.count > 0 && (
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              {item.count} 票
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function RatingsPage() {
  const { data: list = [], isLoading } = useQuery(RATINGS_OPTIONS);
  const [minVotes, setMinVotes] = useState(1);
  const [doubanType, setDoubanType] = useState<'movie' | 'tv' | 'anime'>(
    'movie',
  );

  const { data: doubanHigh = [] } = useQuery(DOUBAN_HIGH_OPTIONS(doubanType));

  const filtered = list.filter((item) => item.count >= minVotes);
  const showDouban = filtered.length < 8;

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

        {/* 用户评分榜 */}
        <section className='mb-10'>
          <h2 className='mb-4 flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-200'>
            <Star className='h-4 w-4 text-primary-500' />
            用户评分榜
            <span className='text-xs font-normal text-gray-400'>
              {filtered.length} 部
            </span>
          </h2>

          {isLoading ? (
            <PosterGridSkeleton count={10} />
          ) : filtered.length === 0 ? (
            <div className='ui-surface py-10 text-center text-sm text-gray-500 dark:text-gray-400'>
              <p>暂无用户评分</p>
              <p className='mt-1 text-xs text-gray-400'>
                播放影片后即可点亮你的评分
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6'>
              {filtered.map((item, index) => (
                <RatingCard
                  key={`${item.videoSource}-${item.videoId}`}
                  item={item}
                  index={index}
                  showRank
                />
              ))}
            </div>
          )}
        </section>

        {/* 豆瓣高分精选：用户评分少时兜底，页面不空 */}
        {showDouban && (
          <section>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-200'>
                <Flame className='h-4 w-4 text-orange-500' />
                豆瓣高分精选
              </h2>
              <div className='flex gap-1'>
                {(
                  [
                    ['movie', '电影'],
                    ['tv', '剧集'],
                    ['anime', '动漫'],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => setDoubanType(t)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      doubanType === t
                        ? 'bg-primary-500 text-gray-950'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6'>
              {doubanHigh.map((item, index) => (
                <RatingCard key={item.videoId} item={item} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
