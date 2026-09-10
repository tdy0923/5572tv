'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Clapperboard,
  Clock,
  Crown,
  Flame,
  Search,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { radius, shadow } from '@/lib/fluent-tokens';
import {
  RANKING_GROUPS,
  RankingBoard,
  RankingGroup,
  RankingItem,
} from '@/lib/rankings';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentTabs,
} from '@/components/FluentUI';
import PageLayout from '@/components/PageLayout';
import PosterGridSkeleton from '@/components/PosterGridSkeleton';
import SectionTitle from '@/components/SectionTitle';
import VideoCard from '@/components/VideoCard';

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
  'site-play': Flame,
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

// 标准榜单卡：复用全站统一 VideoCard（海报代理链 / eager / 评分 / 播放链接），
// 外层只叠加排名角标与可播徽章。
function RankRowCard({
  board,
  item,
  index,
  available,
}: {
  board: RankingBoard;
  item: RankingItem;
  index: number;
  available?: AvailabilityInfo;
}) {
  if (/^\d+$/.test(item.title)) return null;
  const showRank = board.kind === 'douban';

  return (
    <div
      className='relative w-[160px] shrink-0 animate-[fluent2-fade-in_250ms_ease-out_both]'
      style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
    >
      {showRank && (
        <div className='absolute -top-2 -left-2 z-10'>
          <FluentBadge
            variant={index < 3 ? 'primary' : 'default'}
            size='sm'
            rounded
          >
            {index + 1}
          </FluentBadge>
        </div>
      )}
      {available?.available && (
        <div className='absolute -top-2 -right-2 z-10'>
          <FluentBadge variant='success' size='sm' rounded>
            可播放
          </FluentBadge>
        </div>
      )}
      {board.kind === 'douban' ? (
        <VideoCard
          from='douban'
          source='douban'
          id={item.id}
          source_name='豆瓣'
          title={item.title}
          poster={item.poster}
          douban_id={item.douban_id}
          rate={item.rate}
          year={item.year}
          type={item.type}
          eager={index < 12}
        />
      ) : (
        <VideoCard
          from='search'
          source={item.source}
          id={item.id}
          title={item.title}
          poster={item.poster}
          eager={index < 12}
        />
      )}
    </div>
  );
}

function BoardSection({
  board,
  availability,
  onVisible,
}: {
  board: RankingBoard;
  availability: Record<string, AvailabilityInfo>;
  onVisible?: (boardId: string) => void;
}) {
  const Icon = BOARD_ICONS[board.id] || Star;
  const iconColor = BOARD_ICON_COLORS[board.id] || 'text-primary-500';
  const [expanded, setExpanded] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const visibleFiredRef = useRef(false);

  // 进入视口才回调，触发该榜的可用性匹配
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || visibleFiredRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          visibleFiredRef.current = true;
          onVisible?.(board.id);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [board.id, onVisible]);

  const shownItems = expanded ? board.items : board.items.slice(0, 12);

  const header = (
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
      {board.items.length > 12 && (
        <FluentButton
          variant='secondary'
          size='sm'
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '收起' : `展开全部 ${board.items.length} 部`}
        </FluentButton>
      )}
    </div>
  );

  if (board.id === 'site-search') {
    return (
      <div ref={sectionRef}>
        <FluentCard
          variant='default'
          className='home-section mb-8 !p-4 sm:!p-5'
          style={{ borderRadius: radius.xl, boxShadow: shadow.light } as any}
        >
          {header}
          <div className='flex flex-wrap gap-2'>
            {board.items.map((item, index) => (
              <Link
                key={item.id}
                href={`/search?q=${encodeURIComponent(item.query || item.title)}`}
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
        </FluentCard>
      </div>
    );
  }

  return (
    <div ref={sectionRef}>
      <FluentCard
        variant='default'
        className='home-section mb-8 !p-4 sm:!p-5'
        style={{ borderRadius: radius.xl, boxShadow: shadow.light } as any}
      >
        {header}
        <div className='-mx-4 overflow-x-auto px-4 pb-4 pt-3 sm:-mx-5 sm:px-5 [scrollbar-width:thin]'>
          <div className='flex gap-4 sm:gap-5'>
            {shownItems.map((item, index) => (
              <RankRowCard
                key={`${board.id}-${item.id}-${index}`}
                board={board}
                item={item}
                index={index}
                available={availability[item.title]}
              />
            ))}
          </div>
        </div>
      </FluentCard>
    </div>
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

  // 榜单进入视口时才查该榜的可用性（每榜前 10），避免首屏一次打爆源站
  const firedBoardsRef = useRef<Set<string>>(new Set());
  const handleBoardVisible = useCallback(
    (boardId: string) => {
      if (firedBoardsRef.current.has(boardId)) return;
      firedBoardsRef.current.add(boardId);
      const board = populatedBoards.find((b) => b.id === boardId);
      if (!board || board.kind !== 'douban' || board.items.length === 0) return;
      const items = board.items.slice(0, 10).map((it) => ({
        title: it.title,
        douban_id: it.douban_id,
      }));
      (async () => {
        try {
          const res = await fetch('/api/rankings/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items }),
            signal: AbortSignal.timeout(20000),
          });
          if (!res.ok) return;
          const data = await res.json();
          if (!Array.isArray(data.results)) return;
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
    },
    [populatedBoards],
  );

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
            onVisible={handleBoardVisible}
          />
        ))
      )}
    </PageLayout>
  );
}
