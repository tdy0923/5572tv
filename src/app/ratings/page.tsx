'use client';

import { useQuery } from '@tanstack/react-query';
import { Flame, Search, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import {
  FluentEmptyState,
  FluentSelect,
  FluentTabs,
} from '@/components/FluentUI';
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

  const rankTone: Record<
    number,
    { bg: string; fg: string; ring: string; shadow: string }
  > = {
    0: {
      bg: 'linear-gradient(135deg,#f4c24d 0%,#d89c18 100%)',
      fg: '#111',
      ring: 'rgba(244,194,77,0.35)',
      shadow: '0 8px 20px rgba(244,194,77,0.35)',
    },
    1: {
      bg: 'linear-gradient(135deg,#e5e7eb 0%,#9ca3af 100%)',
      fg: '#111827',
      ring: 'rgba(156,163,175,0.3)',
      shadow: '0 6px 16px rgba(0,0,0,0.12)',
    },
    2: {
      bg: 'linear-gradient(135deg,#b45309 0%,#92400e 100%)',
      fg: '#fffbeb',
      ring: 'rgba(180,83,9,0.25)',
      shadow: '0 6px 16px rgba(146,64,14,0.25)',
    },
  };
  const rankStyle =
    showRank && index < 3
      ? rankTone[index]
      : {
          bg: 'rgba(17,17,17,0.72)',
          fg: '#e5e7eb',
          ring: 'rgba(255,255,255,0.08)',
          shadow: '0 4px 12px rgba(0,0,0,0.2)',
        };

  return (
    <Link
      href={href}
      className='group relative block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900'
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {showRank && (
        <div
          className='absolute -top-2 -left-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold backdrop-blur'
          style={{
            background: rankStyle.bg,
            color: rankStyle.fg,
            boxShadow: rankStyle.shadow,
            border: `1px solid ${rankStyle.ring}`,
          }}
          aria-label={`第 ${index + 1} 名`}
        >
          {index + 1}
        </div>
      )}

      <div
        className='relative aspect-[2/3] overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-250 ease-out group-hover:-translate-y-0.5 group-hover:shadow-lg dark:bg-gray-800'
        style={{
          borderColor: 'var(--color-stroke-subtle)',
          boxShadow: 'var(--shadow-2)',
        }}
      >
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading='lazy'
            decoding='async'
            className='h-full w-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.03]'
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            className='flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center'
            style={{ background: 'var(--color-background-subtle)' }}
          >
            <div
              className='flex h-10 w-10 items-center justify-center rounded-full'
              style={{ background: 'rgba(244,194,77,0.12)', color: '#f4c24d' }}
            >
              <Star className='h-5 w-5' />
            </div>
            <span
              className='line-clamp-3 text-xs leading-relaxed'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              {displayTitle}
            </span>
          </div>
        )}
        {/* 评分角标 */}
        <div
          className='absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold leading-none backdrop-blur-md'
          style={{
            background: 'rgba(0,0,0,0.72)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Star className='h-3 w-3 fill-[#f4c24d] text-[#f4c24d]' />
          {item.avgRating.toFixed(1)}
        </div>
        {/* hover 渐变蒙层 */}
        <div
          className='pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-250 group-hover:opacity-100'
          style={{
            background:
              'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.28) 100%)',
          }}
        />
      </div>

      <div className='mt-2.5 flex flex-col gap-1'>
        <p
          className='truncate text-[13px] font-medium leading-tight transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400'
          style={{ color: 'var(--color-foreground)' }}
          title={displayTitle}
        >
          {displayTitle}
        </p>
        <div className='flex items-center gap-1.5'>
          <span
            className='inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold'
            style={{
              background: 'rgba(244,194,77,0.12)',
              color: '#b45309',
              border: '1px solid rgba(244,194,77,0.22)',
            }}
          >
            <Star className='h-3 w-3 fill-[#f4c24d] text-[#f4c24d]' />
            {item.avgRating.toFixed(1)}
          </span>
          {item.count > 0 ? (
            <span
              className='text-xs'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              {item.count} 票
            </span>
          ) : (
            <span
              className='text-xs'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
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
      {/* 标题区 */}
      <div className='mb-6 sm:mb-8'>
        <SectionTitle
          title='评分排行榜'
          icon={TrendingUp}
          iconColor='text-primary-500'
          kicker='Leaderboard'
          index='05'
        />
        <p
          className='mt-3 max-w-2xl text-sm leading-relaxed'
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          用户实时评分，发现高分佳作。参与评分，让好作品被更多人看见。
        </p>
      </div>

      {/* 用户评分榜 */}
      <section
        className='home-section mb-8 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 md:mb-10 dark:bg-white/[0.03]'
        style={{ borderColor: 'var(--color-stroke-subtle)' }}
      >
        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className='flex h-9 w-9 items-center justify-center rounded-xl border text-primary-600 dark:text-primary-400'
              style={{
                background: 'rgba(244,194,77,0.12)',
                borderColor: 'rgba(244,194,77,0.22)',
              }}
            >
              <Star className='h-4 w-4' />
            </div>
            <div>
              <h2
                className='text-[15px] font-semibold'
                style={{ color: 'var(--color-foreground)' }}
              >
                用户评分榜
              </h2>
              <p
                className='text-xs'
                style={{ color: 'var(--color-foreground-muted)' }}
              >
                {filtered.length} 部 · 按平均分排序
                {filtered.length > 0 && ` · 前 3 名高亮`}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2 self-start sm:self-auto'>
            <span
              className='whitespace-nowrap text-xs'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              至少
            </span>
            <FluentSelect
              value={String(minVotes)}
              onChange={(e) =>
                setMinVotes(Number((e.target as HTMLSelectElement).value))
              }
              options={[
                { value: '1', label: '1 票' },
                { value: '2', label: '2 票' },
                { value: '3', label: '3 票' },
                { value: '5', label: '5 票' },
                { value: '10', label: '10 票' },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <PosterGridSkeleton count={12} />
        ) : filtered.length === 0 ? (
          <FluentEmptyState
            icon={<Star className='h-6 w-6' style={{ color: '#f4c24d' }} />}
            title='暂无用户评分'
            description='播放影片后即可点亮你的评分，成为第一个为喜欢的作品投票的人。'
            action={
              <Link
                href='/douban?type=movie'
                className='inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline'
                style={{ color: '#f4c24d' }}
              >
                <Search className='h-3.5 w-3.5' /> 去发现影片 →
              </Link>
            }
          />
        ) : (
          <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6'>
            {filtered.map((item, index) => (
              <div
                key={`${item.videoSource}-${item.videoId}`}
                className='animate-[fluent2-fade-in_250ms_ease-out_both]'
              >
                <RatingCard item={item} index={index} showRank />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 豆瓣高分精选：用户评分少时兜底，页面永不空白 */}
      {showDouban && (
        <section
          className='home-section rounded-2xl border bg-white p-4 shadow-sm sm:p-5 dark:bg-white/[0.03]'
          style={{ borderColor: 'var(--color-stroke-subtle)' }}
        >
          <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-3'>
              <div
                className='flex h-9 w-9 items-center justify-center rounded-xl border text-orange-600 dark:text-orange-400'
                style={{
                  background: 'rgba(251,146,60,0.12)',
                  borderColor: 'rgba(251,146,60,0.22)',
                }}
              >
                <Flame className='h-4 w-4' />
              </div>
              <div>
                <h2
                  className='text-[15px] font-semibold'
                  style={{ color: 'var(--color-foreground)' }}
                >
                  豆瓣高分精选
                </h2>
                <p
                  className='text-xs'
                  style={{ color: 'var(--color-foreground-muted)' }}
                >
                  来自豆瓣的高分佳作 ·{' '}
                  {doubanType === 'movie'
                    ? '电影'
                    : doubanType === 'tv'
                      ? '剧集'
                      : '动漫'}
                </p>
              </div>
            </div>
            <FluentTabs
              tabs={[
                { id: 'movie', label: '电影' },
                { id: 'tv', label: '剧集' },
                { id: 'anime', label: '动漫' },
              ]}
              value={doubanType}
              onChange={(id) => setDoubanType(id as any)}
            />
          </div>
          {doubanLoading ? (
            <PosterGridSkeleton count={12} />
          ) : doubanHigh.length === 0 ? (
            <FluentEmptyState
              icon={<Flame className='h-6 w-6' style={{ color: '#fb923c' }} />}
              title='暂无豆瓣高分'
              description='该分类暂时没有数据，试试切换其他类型。'
            />
          ) : (
            <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6'>
              {doubanHigh.map((item, index) => (
                <div
                  key={item.videoId}
                  className='animate-[fluent2-fade-in_250ms_ease-out_both]'
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <RatingCard item={item} index={index} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </PageLayout>
  );
}
