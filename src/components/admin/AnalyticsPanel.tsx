'use client';

import {
  Activity,
  BarChart3,
  Clock,
  Download,
  Heart,
  Inbox,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { AnalyticsSummary } from '@/lib/analytics-store';

interface AnalyticsPanelProps {
  autoRefresh?: boolean;
}

const DAYS = 30;

// ---------------------------------------------------------------------------
// Fluent 2 primitives
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon,
  helper,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  helper?: string;
}) {
  return (
    <div className='ui-surface rounded-[var(--radius-2xl)] px-4 py-4 sm:px-5 sm:py-4 shadow-[var(--shadow-2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-4)]'>
      <div className='flex items-center justify-between'>
        <span className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]'>
          {label}
        </span>
        <span className='flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-background-subtle)] text-[var(--color-foreground-muted)]'>
          {icon}
        </span>
      </div>
      <div className='mt-2 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]'>
        {value}
      </div>
      {helper && (
        <div className='mt-1 text-xs text-[var(--color-foreground-muted)]'>
          {helper}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className='ui-surface rounded-[var(--radius-2xl)] px-5 py-4 shadow-[var(--shadow-2)]'>
      <div className='h-3 w-20 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
      <div className='mt-3 h-7 w-16 rounded-lg bg-[var(--color-background-muted)] animate-pulse' />
      <div className='mt-2 h-3 w-24 rounded-full bg-[var(--color-background-muted)] animate-pulse opacity-60' />
    </div>
  );
}

function KpiSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4'>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function FluentEmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className='ui-surface rounded-[var(--radius-2xl)] px-6 py-10 text-center shadow-[var(--shadow-2)]'>
      <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-background-subtle)] text-[var(--color-foreground-muted)]'>
        {icon}
      </div>
      <div className='mt-3 text-sm font-semibold text-[var(--color-foreground)]'>
        {title}
      </div>
      <p className='mx-auto mt-1 max-w-[32ch] text-xs leading-relaxed text-[var(--color-foreground-muted)]'>
        {description}
      </p>
    </div>
  );
}

function PanelCard({
  title,
  badge,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className='ui-surface rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-2)] group'
      open={defaultOpen}
    >
      <summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-6 hover:bg-[var(--color-background-subtle)] transition-colors [&::-webkit-details-marker]:hidden'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <h3 className='text-sm font-semibold text-[var(--color-foreground)]'>
              {title}
            </h3>
            {badge && (
              <span className='rounded-full border border-[var(--color-stroke)] bg-[var(--color-background)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-foreground-muted)]'>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className='mt-0.5 text-xs text-[var(--color-foreground-muted)]'>
              {description}
            </p>
          )}
        </div>
        <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-stroke)] bg-[var(--color-background)] text-[var(--color-foreground-muted)] transition-transform group-open:rotate-180'>
          <svg width='14' height='14' viewBox='0 0 16 16' fill='none' aria-hidden>
            <path
              d='M4 6l4 4 4-4'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </span>
      </summary>
      <div className='border-t border-[var(--color-stroke-subtle)] px-4 py-4 sm:px-6 sm:py-5 bg-[var(--color-background)]'>
        {children}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Trend chart — Fluent 2 restrained bar chart
// ---------------------------------------------------------------------------

function TrendChart({ daily }: { daily: AnalyticsSummary['daily'] }) {
  const items = daily.slice(-14);
  const maxPv = Math.max(...items.map((d) => d.pv), 1);
  const maxPlays = Math.max(...items.map((d) => d.plays), 1);
  const maxForPlays = Math.max(maxPlays, maxPv);

  if (items.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-[var(--color-stroke)] bg-[var(--color-background-subtle)] px-6 py-10 text-center'>
        <div className='mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-background)] text-[var(--color-foreground-muted)]'>
          <BarChart3 size={16} />
        </div>
        <div className='mt-2 text-sm font-medium text-[var(--color-foreground-muted)]'>
          暂无趋势数据
        </div>
        <p className='mt-1 text-xs text-[var(--color-foreground-muted)]'>
          数据将在用户产生访问后出现
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-3 text-[11px] font-medium text-[var(--color-foreground-muted)]'>
        <span className='flex items-center gap-1.5'>
          <span className='h-2 w-2 rounded-full bg-[#0f6cbd]' /> PV
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-2 w-2 rounded-full bg-[#038387]' /> 播放
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='h-2 w-2 rounded-full bg-[#c30052]' /> 搜索
        </span>
      </div>
      <div className='flex items-end gap-1 sm:gap-1.5 h-28 sm:h-32'>
        {items.map((d) => (
          <div
            key={d.date}
            className='flex flex-1 flex-col items-center justify-end h-full gap-1.5'
            title={`${d.date}  PV:${d.pv}  播放:${d.plays}  搜索:${d.searches}  UV:${d.uv}`}
          >
            <div className='flex w-full max-w-[44px] items-end justify-center gap-px sm:gap-[2px] h-full'>
              <div
                className='flex-1 rounded-t-[3px] bg-[#0f6cbd] transition-all'
                style={{ height: `${Math.max((d.pv / maxPv) * 100, 3)}%` }}
              />
              <div
                className='flex-1 rounded-t-[3px] bg-[#038387]/90'
                style={{
                  height: `${Math.max((d.plays / maxForPlays) * 100, d.plays ? 3 : 0)}%`,
                }}
              />
              <div
                className='flex-1 rounded-t-[3px] bg-[#c30052]/85'
                style={{
                  height: `${Math.max((d.searches / maxForPlays) * 100, d.searches ? 3 : 0)}%`,
                }}
              />
            </div>
            <span className='text-[9px] font-medium leading-none tracking-tight text-[var(--color-foreground-muted)]'>
              {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopList<T extends { count: number }>({
  title,
  items,
  render,
}: {
  title: string;
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <PanelCard title={title} badge={`共 ${items.length} 项`}>
      {items.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-6 text-center'>
          <span className='flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-background-subtle)] text-[var(--color-foreground-muted)]'>
            <Inbox size={16} />
          </span>
          <span className='mt-2 text-xs text-[var(--color-foreground-muted)]'>
            暂无数据
          </span>
        </div>
      ) : (
        <div className='space-y-1'>
          {items.map((item, index) => (
            <div
              key={index}
              className='flex items-center gap-3 rounded-[var(--radius-lg)] px-2 py-2 hover:bg-[var(--color-background-subtle)] transition-colors'
            >
              <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-background-subtle)] text-[11px] font-semibold tabular-nums text-[var(--color-foreground-muted)]'>
                {index + 1}
              </span>
              <div className='flex-1 min-w-0 text-sm'>{render(item, index)}</div>
              <span className='shrink-0 rounded-full bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]/30 px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--color-primary-700)] dark:text-[var(--color-primary-300)]'>
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

export default function AnalyticsPanel({
  autoRefresh = false,
}: AnalyticsPanelProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackVideos, setFallbackVideos] = useState<
    { videoId: string; title: string; count: number }[] | null
  >(null);
  const [recordTop, setRecordTop] = useState<
    { videoId: string; title: string; count: number }[] | null
  >(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?days=${DAYS}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        if (
          json.data &&
          (json.data.totals.plays === 0 || json.data.topVideos.length === 0)
        ) {
          try {
            const r2 = await fetch('/api/admin/play-stats');
            if (r2.ok) {
              const j2 = await r2.json();
              const list: { videoId: string; title: string; count: number }[] =
                [];
              const src = j2.data || j2;
              const rawList = src?.topVideos || src?.topContents || [];
              if (Array.isArray(rawList)) {
                for (const v of rawList.slice(0, 10)) {
                  list.push({
                    videoId: String(
                      (v as Record<string, unknown>).videoId ||
                        (v as Record<string, unknown>).id ||
                        (v as Record<string, unknown>).title ||
                        '',
                    ),
                    title: String(
                      (v as Record<string, unknown>).title ||
                        (v as Record<string, unknown>).videoId ||
                        '',
                    ),
                    count: Number(
                      (v as Record<string, unknown>).playCount ||
                        (v as Record<string, unknown>).count ||
                        1,
                    ),
                  });
                }
              }
              if (list.length > 0) setFallbackVideos(list);
            }
          } catch {}
        } else {
          setFallbackVideos(null);
        }
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const fetchRecordTop = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/play-stats');
      if (!r.ok) return;
      const j = await r.json();
      const src = j.data || j;
      const rawList = (src?.topVideos as unknown[]) || [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        const list = rawList.slice(0, 10).map((v) => {
          const o = v as Record<string, unknown>;
          return {
            videoId: String(o.videoId || o.title || ''),
            title: String(o.title || o.videoId || ''),
            count: Number(o.playCount || o.count || 1),
          };
        });
        setRecordTop(list);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchRecordTop();
  }, [fetchRecordTop]);

  if (loading) {
    return (
      <div className='space-y-4'>
        <KpiSkeletonGrid count={8} />
        <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className='ui-surface rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-2)]'>
          <div className='h-4 w-32 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
          <div className='mt-4 h-28 rounded-xl bg-[var(--color-background-muted)] animate-pulse' />
        </div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className='ui-surface rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-2)]'
            >
              <div className='h-4 w-24 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
              <div className='mt-3 space-y-2'>
                {Array.from({ length: 3 }).map((__, j) => (
                  <div
                    key={j}
                    className='h-3 rounded-full bg-[var(--color-background-muted)] animate-pulse'
                    style={{ width: `${70 + j * 7}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <FluentEmptyState
        icon={<Activity size={20} />}
        title='暂无用户行为数据'
        description='事件将在用户访问后产生。数据为空时为正常现象，完成一次访问与播放即可看到统计。'
      />
    );
  }

  const t = data.totals;
  const showFallback = fallbackVideos && fallbackVideos.length > 0;

  return (
    <div className='space-y-4 sm:space-y-5'>
      {/* 汇总卡片 */}
      <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4'>
        <KpiCard
          label='页面访问 PV'
          value={t.pv}
          helper='总访问次数'
          icon={<Activity className='h-4 w-4 text-[#0f6cbd]' />}
        />
        <KpiCard
          label='独立访客 UV'
          value={t.uv}
          helper='去重访客'
          icon={<Users className='h-4 w-4 text-[#107c10]' />}
        />
        <KpiCard
          label='活跃用户'
          value={t.activeUsers}
          helper='近 30 天'
          icon={<TrendingUp className='h-4 w-4 text-[#5c2d91]' />}
        />
        <KpiCard
          label='登录次数'
          value={t.logins}
          helper='累计登录'
          icon={<Clock className='h-4 w-4 text-[#d83b01]' />}
        />
        <KpiCard
          label='播放次数'
          value={t.plays}
          helper='累计播放'
          icon={<Activity className='h-4 w-4 text-[#038387]' />}
        />
        <KpiCard
          label='搜索次数'
          value={t.searches}
          helper='累计搜索'
          icon={<Search className='h-4 w-4 text-[#c30052]' />}
        />
        <KpiCard
          label='收藏次数'
          value={t.favorites}
          helper='累计收藏'
          icon={<Heart className='h-4 w-4 text-[#e81123]' />}
        />
        <KpiCard
          label='APP 下载'
          value={t.downloads}
          helper='累计下载'
          icon={<Download className='h-4 w-4 text-[#0078d4]' />}
        />
      </div>

      {/* 转化漏斗 */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4'>
        <KpiCard
          label='搜索→播放转化'
          value={
            t.searches ? `${((t.plays / t.searches) * 100).toFixed(1)}%` : '—'
          }
          helper={t.searches ? `${t.plays} / ${t.searches}` : '暂无搜索'}
          icon={<TrendingUp className='h-4 w-4 text-[#038387]' />}
        />
        <KpiCard
          label='人均播放'
          value={t.uv ? (t.plays / t.uv).toFixed(2) : '0'}
          helper='播放 / UV'
          icon={<Activity className='h-4 w-4 text-[#038387]' />}
        />
        <KpiCard
          label='人均搜索'
          value={t.uv ? (t.searches / t.uv).toFixed(2) : '0'}
          helper='搜索 / UV'
          icon={<Search className='h-4 w-4 text-[#c30052]' />}
        />
      </div>

      {/* 近 14 天 PV/UV 趋势 */}
      <PanelCard
        title='近 14 天访问趋势'
        description='PV / 播放 / 搜索 日粒度对比'
      >
        <TrendChart daily={data.daily} />
      </PanelCard>

      {/* 行为 Top 榜单 */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <TopList
          title='热门访问页面'
          items={data.topPages}
          render={(item) => (
            <a
              href={item.path}
              className='truncate block text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] hover:underline dark:text-[var(--color-primary-400)]'
              title={item.path}
            >
              {item.path}
            </a>
          )}
        />
        <TopList
          title='热门搜索词'
          items={data.topSearches}
          render={(item) => (
            <a
              href={`/search?q=${encodeURIComponent(item.query)}`}
              className='truncate block text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] hover:underline dark:text-[var(--color-primary-400)]'
              title={`搜索 ${item.query}`}
            >
              {item.query}
            </a>
          )}
        />
        <div className='space-y-2'>
          <TopList
            title='热门播放影片'
            items={
              data.topVideos.length > 0 ? data.topVideos : fallbackVideos || []
            }
            render={(item) => {
              const vid = String(item.videoId || '');
              const title = String(item.title || vid);
              let href = `/search?q=${encodeURIComponent(title)}`;
              if (vid.includes(':')) {
                const [s, ...rest] = vid.split(':');
                const id = rest.join(':');
                if (s && id)
                  href = `/play?source=${encodeURIComponent(s)}&id=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}`;
              } else if (vid.includes('+')) {
                const [s, ...rest] = vid.split('+');
                const id = rest.join('+');
                if (s && id)
                  href = `/play?source=${encodeURIComponent(s)}&id=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}`;
              }
              return (
                <a
                  href={href}
                  className='min-w-0 block hover:opacity-80 transition-opacity'
                  title={`播放 ${title}`}
                >
                  <div className='truncate text-[var(--color-primary-600)] hover:underline dark:text-[var(--color-primary-400)]'>
                    {title}
                  </div>
                  <div className='truncate text-xs text-[var(--color-foreground-muted)]'>
                    {vid}
                  </div>
                </a>
              );
            }}
          />
          {showFallback && (
            <div className='rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300'>
              行为统计暂无播放数据，已降级展示播放记录中的热门影片（修复后新播放才会进入行为统计）
            </div>
          )}
        </div>
        <TopList
          title='下载渠道'
          items={data.topDownloads}
          render={(item) => (
            <span className='truncate block text-[var(--color-foreground)]'>
              {item.apk}
            </span>
          )}
        />
        {recordTop && recordTop.length > 0 && (
          <TopList
            title='热门播放（播放记录，持久化）'
            items={recordTop}
            render={(item) => {
              const vid = String(item.videoId || '');
              const title = String(item.title || vid);
              let href = `/search?q=${encodeURIComponent(title)}`;
              if (vid.includes(':')) {
                const [s, ...rest] = vid.split(':');
                const id = rest.join(':');
                if (s && id)
                  href = `/play?source=${encodeURIComponent(s)}&id=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}`;
              } else if (vid.includes('+')) {
                const [s, ...rest] = vid.split('+');
                const id = rest.join('+');
                if (s && id)
                  href = `/play?source=${encodeURIComponent(s)}&id=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}`;
              }
              return (
                <a
                  href={href}
                  className='min-w-0 block hover:opacity-80 transition-opacity'
                  title={`播放 ${title}`}
                >
                  <div className='truncate text-[var(--color-primary-600)] hover:underline dark:text-[var(--color-primary-400)]'>
                    {title}
                  </div>
                  <div className='truncate text-xs text-[var(--color-foreground-muted)]'>
                    {vid}
                  </div>
                </a>
              );
            }}
          />
        )}
        <TopList
          title='热门来源'
          items={data.topReferrers}
          render={(item) => (
            <span
              className='truncate block text-[var(--color-foreground)]'
              title={item.domain}
            >
              {item.domain}
            </span>
          )}
        />
        <TopList
          title='入口页面'
          items={data.entryPages}
          render={(item) => (
            <a
              href={item.path}
              className='truncate block text-[var(--color-primary-600)] hover:text-[var(--color-primary-400)] hover:underline'
              title={item.path}
            >
              {item.path}
            </a>
          )}
        />
      </div>

      {/* 活跃用户表 */}
      <PanelCard title={`活跃用户（最近 ${DAYS} 天）`} description='按用户聚合的访问与行为明细'>
        {data.users.length === 0 ? (
          <FluentEmptyState
            icon={<Users size={20} />}
            title='暂无已登录用户行为数据'
            description='仅统计已登录用户的行为，匿名访问不会进入此表。'
          />
        ) : (
          <div className='-mx-4 sm:mx-0 overflow-x-auto'>
            <div className='inline-block min-w-full align-middle'>
              <table className='min-w-full'>
                <thead>
                  <tr className='border-b border-[var(--color-stroke-subtle)]'>
                    {['用户', '访问', '播放', '搜索', '收藏', '下载', '最后活跃'].map(
                      (h) => (
                        <th
                          key={h}
                          className='whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground-muted)] sm:px-4'
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className='divide-y divide-[var(--color-stroke-subtle)]'>
                  {data.users.map((u) => (
                    <tr key={u.uid} className='hover:bg-[var(--color-background-subtle)] transition-colors'>
                      <td className='whitespace-nowrap px-3 py-3 text-sm font-medium text-[var(--color-foreground)] sm:px-4'>
                        {u.uid}
                      </td>
                      <td className='whitespace-nowrap px-3 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-4'>
                        {u.pv}
                      </td>
                      <td className='whitespace-nowrap px-3 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-4'>
                        {u.plays}
                      </td>
                      <td className='whitespace-nowrap px-3 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-4'>
                        {u.searches}
                      </td>
                      <td className='whitespace-nowrap px-3 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-4'>
                        {u.favorites}
                      </td>
                      <td className='whitespace-nowrap px-3 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-4'>
                        {u.downloads}
                      </td>
                      <td className='whitespace-nowrap px-3 py-3 text-xs text-[var(--color-foreground-muted)] sm:px-4'>
                        {new Date(u.lastActive).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
