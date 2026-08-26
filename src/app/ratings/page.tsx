'use client';

import { useQuery } from '@tanstack/react-query';
import { Flame, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import PageLayout from '@/components/PageLayout';
import PosterGridSkeleton from '@/components/PosterGridSkeleton';
import SectionTitle from '@/components/SectionTitle';

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
  const displayTitle = /^\d+$/.test(item.title)
    ? `影片 #${item.title}`
    : item.title;

  const href =
    item.videoSource === 'douban'
      ? `/play?title=${encodeURIComponent(item.title)}&douban_id=${encodeURIComponent(item.videoId)}&stype=${item.type || 'movie'}`
      : `/play?source=${encodeURIComponent(item.videoSource)}&id=${encodeURIComponent(item.videoId)}&title=${encodeURIComponent(item.title)}`;

  return (
    <Link href={href} className='group relative block'>
      {showRank && (
        <div
          className={`absolute -top-1.5 -left-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shadow-md ${
            index === 0
              ? 'bg-linear-to-br from-primary-400 to-primary-600 text-gray-950 shadow-primary-500/30'
              : index === 1
                ? 'bg-gray-300 text-gray-800 shadow-md dark:bg-gray-600 dark:text-gray-100'
                : index === 2
                  ? 'bg-amber-700/90 text-amber-100 shadow-amber-900/20'
                  : 'bg-gray-800/80 text-gray-200 backdrop-blur'
          }`}
        >
          {index + 1}
        </div>
      )}

      <div className='relative aspect-[2/3] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary-300/70 group-hover:shadow-[0_18px_38px_-10px_rgba(244,194,77,0.35)] dark:border-gray-700 dark:bg-gray-800 dark:group-hover:border-primary-500/40'>
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
            <span className='line-clamp-3 text-xs text-gray-500'>
              {displayTitle}
            </span>
          </div>
        )}
        {/* 评分角标悬浮于海报右下 */}
        <div className='absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm'>
          <Star className='h-3 w-3 fill-primary-400 text-primary-400' />
          {item.avgRating.toFixed(1)}
        </div>
      </div>

      <div className='mt-2 space-y-0.5'>
        <p className='truncate text-sm font-medium leading-tight text-gray-800 transition-colors group-hover:text-primary-600 dark:text-gray-200 dark:group-hover:text-primary-400'>
          {displayTitle}
        </p>
        <div className='flex items-center gap-1'>
          <Star className='h-3.5 w-3.5 fill-primary-500 text-primary-500' />
          <span className='text-sm font-semibold text-primary-600 dark:text-primary-400'>
            {item.avgRating.toFixed(1)}
          </span>
          {item.count > 0 ? (
            <span className='text-xs text-gray-500 dark:text-gray-400'>
              {item.count} 票
            </span>
          ) : (
            <span className='text-xs text-gray-400 dark:text-gray-500'>
              豆瓣 {item.avgRating.toFixed(1)}
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

  const { data: doubanHigh = [], isLoading: doubanLoading } = useQuery(
    DOUBAN_HIGH_OPTIONS(doubanType),
  );

  const filtered = list.filter((item) => item.count >= minVotes);
  const showDouban = filtered.length < 8;

  return (
    <PageLayout activePath='/ratings'>
      {/* 标题区：与首页 SectionTitle 风格统一 */}
      <div className='mb-8'>
        <SectionTitle
          title='评分排行榜'
          icon={TrendingUp}
          iconColor='text-primary-500'
          kicker='Leaderboard'
          index='05'
        />
        <p className='mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400'>
          用户实时评分，发现高分佳作。参与评分，让好作品被更多人看见。
        </p>
      </div>

      {/* 用户评分榜 */}
      <section className='home-section mb-8 md:mb-10'>
        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex h-8 w-8 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400'>
              <Star className='h-4 w-4' />
            </div>
            <div>
              <h2 className='text-[15px] font-semibold text-gray-900 dark:text-white'>
                用户评分榜
              </h2>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {filtered.length} 部 · 按平均分排序
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2 self-start sm:self-auto'>
            <span className='whitespace-nowrap text-xs text-gray-500 dark:text-gray-400'>
              至少
            </span>
            <div className='relative'>
              <select
                value={minVotes}
                onChange={(e) => setMinVotes(Number(e.target.value))}
                className='ui-input h-9 min-w-[84px] pr-7 text-sm'
              >
                {[1, 2, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} 票
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <PosterGridSkeleton count={12} />
        ) : filtered.length === 0 ? (
          <div className='ui-surface flex flex-col items-center justify-center gap-3 py-12 text-center'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/20'>
              <Star className='h-6 w-6 text-primary-500' />
            </div>
            <div>
              <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                暂无用户评分
              </p>
              <p className='mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500 dark:text-gray-400'>
                播放影片后即可点亮你的评分，成为第一个为喜欢的作品投票的人
              </p>
            </div>
            <Link
              href='/douban?type=movie'
              className='mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400'
            >
              去发现影片 →
            </Link>
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

      {/* 豆瓣高分精选：用户评分少时兜底，页面永不空白 */}
      {showDouban && (
        <section className='home-section'>
          <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400'>
                <Flame className='h-4 w-4' />
              </div>
              <div>
                <h2 className='text-[15px] font-semibold text-gray-900 dark:text-white'>
                  豆瓣高分精选
                </h2>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  来自豆瓣的高分佳作
                </p>
              </div>
            </div>
            <div className='flex gap-1.5 self-start sm:self-auto'>
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
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    doubanType === t
                      ? 'bg-primary-500 text-gray-950 shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {doubanLoading ? (
            <PosterGridSkeleton count={12} />
          ) : (
            <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6'>
              {doubanHigh.map((item, index) => (
                <RatingCard key={item.videoId} item={item} index={index} />
              ))}
            </div>
          )}
        </section>
      )}
    </PageLayout>
  );
}
