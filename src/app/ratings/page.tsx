'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Clapperboard,
  Clock,
  Crown,
  Flame,
  Play,
  Search,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  RANKING_GROUPS,
  RankingBoard,
  RankingGroup,
  RankingItem,
} from '@/lib/rankings';
import { resolveCardPosterUrl } from '@/lib/utils';

import { FluentEmptyState, FluentTabs } from '@/components/FluentUI';
import PageLayout from '@/components/PageLayout';
import PosterGridSkeleton from '@/components/PosterGridSkeleton';
import SectionTitle from '@/components/SectionTitle';

interface AvailabilityInfo {
  available: boolean;
  source?: string;
  id?: string;
}

const RANKINGS_OPTIONS = {
  queryKey: ['rankings', 'boards'],
  queryFn: async (): Promise<{ boards: RankingBoard[] }> => {
    const res = await fetch('/api/rankings', {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { boards: [] };
    return res.json();
  },
  staleTime: 5 * 60 * 1000,
  retry: 1,
  gcTime: 10 * 60 * 1000,
};

const BOARD_ICONS: Record<string, typeof Crown> = {
  'douban-movie-top250': Crown,
  'douban-movie-hot': Flame,
  'douban-tv-hot': Flame,
  'douban-variety': Sparkles,
  'douban-movie-new': Clock,
  'douban-anime': Clapperboard,
  'site-play': Play,
  'site-search': Search,
};

const BOARD_ICON_COLORS: Record<string, string> = {
  'douban-movie-top250': 'text-amber-500',
  'douban-movie-hot': 'text-orange-500',
  'douban-tv-hot': 'text-orange-500',
  'douban-variety': 'text-fuchsia-500',
  'douban-anime': 'text-rose-500',
  'site-play': 'text-emerald-500',
  'site-search': 'text-blue-500',
};

function itemHref(item: RankingItem): string {
  if (item.query) {
    return `/search?q=${encodeURIComponent(item.query)}`;
  }
  if (item.source && item.id) {
    return `/play?source=${encodeURIComponent(item.source)}&id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(item.title)}`;
  }
  const stype = item.type === 'tv' || item.type === 'anime' ? 'tv' : 'movie';
  return `/play?title=${encodeURIComponent(item.title)}&douban_id=${encodeURIComponent(item.id)}&stype=${stype}`;
}

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

function BoardCard({
  item,
  index,
  showRank,
  available,
}: {
  item: RankingItem;
  index: number;
  showRank: boolean;
  available?: AvailabilityInfo;
}) {
  if (/^\d+$/.test(item.title)) return null;
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
      href={itemHref(item)}
      className='group relative block w-[120px] shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-[132px] dark:focus-visible:ring-offset-gray-900'
    >
      {showRank && (
        <div
          className='absolute -top-2 -left-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold backdrop-blur'
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

      {/* 可播放徽章 */}
      {available?.available && (
        <div className='absolute -top-2 -right-2 z-10 flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md'>
          <Play className='h-2.5 w-2.5 fill-current' />
          可播放
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
            src={resolveCardPosterUrl(item.poster)}
            alt={item.title}
            loading='lazy'
            decoding='async'
            className='h-full w-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.03]'
            onError={(e) => {
              const t = e.currentTarget as HTMLImageElement;
              t.style.display = 'none';
              const fb = t.nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className='absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center'
          style={{
            background: 'var(--color-background-subtle)',
            display: item.poster ? 'none' : 'flex',
          }}
        >
          <div
            className='flex h-9 w-9 items-center justify-center rounded-full'
            style={{ background: 'rgba(244,194,77,0.12)', color: '#f4c24d' }}
          >
            <Star className='h-4 w-4' />
          </div>
          <span
            className='line-clamp-3 text-[11px] leading-relaxed'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            {item.title}
          </span>
        </div>

        {item.rate ? (
          <div
            className='absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold leading-none backdrop-blur-md'
            style={{
              background: 'rgba(0,0,0,0.72)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Star className='h-3 w-3 fill-[#f4c24d] text-[#f4c24d]' />
            {item.rate}
          </div>
        ) : item.count != null ? (
          <div
            className='absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold leading-none backdrop-blur-md'
            style={{
              background: 'rgba(0,0,0,0.72)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {item.count}
          </div>
        ) : null}

        <div
          className='pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-250 group-hover:opacity-100'
          style={{
            background:
              'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.28) 100%)',
          }}
        />
      </div>

      <p
        className='mt-2 line-clamp-2 min-h-[2.5rem] text-[12px] font-medium leading-tight transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400'
        style={{ color: 'var(--color-foreground)' }}
        title={item.title}
      >
        {item.title}
      </p>
    </Link>
  );
}

function BoardSection({
  board,
  availability,
}: {
  board: RankingBoard;
  availability: Record<string, AvailabilityInfo>;
}) {
  const Icon = BOARD_ICONS[board.id] || Star;
  const iconColor = BOARD_ICON_COLORS[board.id] || 'text-primary-500';

  if (board.id === 'site-search') {
    return (
      <section
        className='home-section mb-8 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 dark:bg-white/[0.03]'
        style={{ borderColor: 'var(--color-stroke-subtle)' }}
      >
        <div className='mb-4 flex items-center gap-3'>
          <div
            className='flex h-9 w-9 items-center justify-center rounded-xl border'
            style={{
              background: 'rgba(59,130,246,0.12)',
              borderColor: 'rgba(59,130,246,0.22)',
            }}
          >
            <Search className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div>
            <h2
              className='text-[15px] font-semibold'
              style={{ color: 'var(--color-foreground)' }}
            >
              {board.title}
            </h2>
            <p
              className='text-xs'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              {board.subtitle}
            </p>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          {board.items.map((item, index) => (
            <Link
              key={item.id}
              href={itemHref(item)}
              className='inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary-500/10 hover:border-primary-500/30'
              style={{
                borderColor: 'var(--color-stroke-subtle)',
                color: 'var(--color-foreground)',
              }}
            >
              <span
                className='font-bold'
                style={{
                  color:
                    index < 3 ? '#f4c24d' : 'var(--color-foreground-muted)',
                }}
              >
                {index + 1}
              </span>
              {item.title}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className='home-section mb-8 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 dark:bg-white/[0.03]'
      style={{ borderColor: 'var(--color-stroke-subtle)' }}
    >
      <div className='mb-4 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div
            className='flex h-9 w-9 items-center justify-center rounded-xl border'
            style={{
              background: 'rgba(244,194,77,0.12)',
              borderColor: 'rgba(244,194,77,0.22)',
            }}
          >
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div>
            <h2
              className='text-[15px] font-semibold'
              style={{ color: 'var(--color-foreground)' }}
            >
              {board.title}
            </h2>
            <p
              className='text-xs'
              style={{ color: 'var(--color-foreground-muted)' }}
            >
              {board.subtitle} · {board.items.length} 部
            </p>
          </div>
        </div>
      </div>

      {board.items.length === 0 ? (
        <FluentEmptyState
          icon={<Star className='h-6 w-6' style={{ color: '#f4c24d' }} />}
          title='暂无数据'
          description='榜单暂时没有内容，稍后再来看看。'
        />
      ) : (
        <div className='-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-5 sm:px-5 [scrollbar-width:thin]'>
          <div className='flex gap-3 sm:gap-4'>
            {board.items.map((item, index) => (
              <div
                key={`${board.id}-${item.id}-${index}`}
                className='animate-[fluent2-fade-in_250ms_ease-out_both]'
                style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
              >
                <BoardCard
                  item={item}
                  index={index}
                  showRank={board.kind === 'douban'}
                  available={availability[item.title]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function RatingsPage() {
  const [group, setGroup] = useState<RankingGroup>('movie');
  const [availability, setAvailability] = useState<
    Record<string, AvailabilityInfo>
  >({});

  const { data: rankingsData, isLoading: rankingsLoading } =
    useQuery(RANKINGS_OPTIONS);

  const populatedBoards = useMemo<RankingBoard[]>(
    () => (rankingsData?.boards ?? []).filter((b) => b.items.length > 0),
    [rankingsData],
  );

  // 仅展示有内容的分组
  const groupsWithContent = useMemo(
    () =>
      RANKING_GROUPS.filter((g) =>
        populatedBoards.some((b) => b.group === g.id),
      ),
    [populatedBoards],
  );

  const activeGroup: RankingGroup = groupsWithContent.some(
    (g) => g.id === group,
  )
    ? group
    : (groupsWithContent[0]?.id ?? group);

  const visibleBoards = useMemo(
    () => populatedBoards.filter((b) => b.group === activeGroup),
    [populatedBoards, activeGroup],
  );

  // 对当前分组的豆瓣榜条目做批量可用性匹配（top 15 / 榜）
  useEffect(() => {
    const doubanItems = visibleBoards
      .filter((b) => b.kind === 'douban')
      .flatMap((b) =>
        b.items.slice(0, 15).map((it) => ({
          title: it.title,
          douban_id: it.douban_id,
        })),
      );

    if (doubanItems.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/rankings/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: doubanItems }),
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data.results)) return;
        const map: Record<string, AvailabilityInfo> = {};
        for (const r of data.results) {
          if (r.title) {
            map[r.title] = {
              available: !!r.available,
              source: r.source,
              id: r.id,
            };
          }
        }
        setAvailability((prev) => ({ ...prev, ...map }));
      } catch {
        // 匹配失败静默，不影响榜单展示
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visibleBoards]);

  return (
    <PageLayout activePath='/ratings'>
      <div className='mb-6 sm:mb-8'>
        <SectionTitle
          title='热门榜单'
          icon={Trophy}
          iconColor='text-primary-500'
          kicker='Rankings'
          index='05'
        />
        <p
          className='mt-3 max-w-2xl text-sm leading-relaxed'
          style={{ color: 'var(--color-foreground-muted)' }}
        >
          汇聚豆瓣各类型权威榜单，点击即可直达播放，标记「可播放」的均为站内已有资源。
        </p>
      </div>

      {/* 分组导航 */}
      {groupsWithContent.length > 1 && (
        <div className='mb-6'>
          <FluentTabs
            tabs={groupsWithContent.map((g) => ({ id: g.id, label: g.label }))}
            value={activeGroup}
            onChange={(id) => setGroup(id as RankingGroup)}
          />
        </div>
      )}

      {rankingsLoading ? (
        <PosterGridSkeleton count={12} />
      ) : visibleBoards.length === 0 ? (
        <FluentEmptyState
          icon={<Star className='h-6 w-6' style={{ color: '#f4c24d' }} />}
          title='暂无榜单'
          description='暂时没有榜单数据，稍后再来看看。'
          action={
            <Link
              href='/douban?type=movie'
              className='inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline'
              style={{ color: '#f4c24d' }}
            >
              <Search className='h-3.5 w-3.5' /> 去豆瓣浏览 →
            </Link>
          }
        />
      ) : (
        visibleBoards.map((board) => (
          <BoardSection
            key={board.id}
            board={board}
            availability={availability}
          />
        ))
      )}
    </PageLayout>
  );
}
