'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import type { PlayerErrorSummary } from '@/lib/analytics-store';
import { usePagination } from '@/hooks/usePagination';

import PaginationBar from '@/components/PaginationBar';

interface PlayerErrorsPanelProps {
  autoRefresh?: boolean;
}

const DAY_OPTIONS = [3, 7, 14];

const KIND_LABEL: Record<string, string> = {
  error: '播放错误',
  source_switch: '切源',
  summary: '播放汇总',
};

function formatTs(ts: number): string {
  try {
    return new Date(ts).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return String(ts);
  }
}

export default function PlayerErrorsPanel({
  autoRefresh = false,
}: PlayerErrorsPanelProps) {
  const [data, setData] = useState<PlayerErrorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(3);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/player-errors?days=${days}`);
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const json = (await res.json()) as PlayerErrorSummary;
      setData(json);
      setExpandedKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of data?.top ?? []) {
      counts[g.kind] = (counts[g.kind] ?? 0) + g.count;
    }
    return counts;
  }, [data]);

  const {
    page: recentPage,
    setPage: setRecentPage,
    totalPages: recentTotalPages,
    pagedItems: pagedRecent,
  } = usePagination(data?.recent ?? [], 10);

  if (loading) {
    return (
      <div className='space-y-2'>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className='h-10 animate-pulse rounded-lg bg-[var(--color-background-subtle)]'
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400'>
        {error}
        <button
          type='button'
          onClick={fetchData}
          className='ml-3 underline underline-offset-2'
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm text-[var(--color-foreground-muted)]'>
          共 {data?.total ?? 0} 条
        </span>
        {Object.entries(kindCounts).map(([kind, count]) => (
          <span
            key={kind}
            className='rounded-full border border-[var(--color-stroke)] bg-[var(--color-background-subtle)] px-2 py-0.5 text-[11px] text-[var(--color-foreground-muted)]'
          >
            {KIND_LABEL[kind] ?? kind} {count}
          </span>
        ))}
        <span className='ml-auto flex items-center gap-1'>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type='button'
              onClick={() => setDays(d)}
              className={`rounded-lg px-2 py-1 text-xs transition-colors ${
                days === d
                  ? 'bg-blue-600 font-medium text-white'
                  : 'text-[var(--color-foreground-muted)] hover:bg-[var(--color-background-subtle)]'
              }`}
            >
              {d} 天
            </button>
          ))}
        </span>
      </div>

      {!data || data.total === 0 ? (
        <div className='rounded-lg bg-[var(--color-background-subtle)] px-4 py-6 text-center text-sm text-[var(--color-foreground-muted)]'>
          选定时间范围内暂无播放器错误
        </div>
      ) : (
        <>
          <div className='overflow-x-auto'>
            <table className='min-w-full'>
              <thead>
                <tr className='border-b border-[var(--color-stroke-subtle)] bg-[var(--color-background-subtle)]'>
                  {['类型', '错误信息', '次数', '最后发生'].map((h) => (
                    <th
                      key={h}
                      className='whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground-muted)] sm:px-6'
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-[var(--color-stroke-subtle)]'>
                {data.top.map((g) => {
                  const key = `${g.kind}::${g.message}`;
                  const isOpen = expandedKey === key;
                  return (
                    <Fragment key={key}>
                      <tr
                        onClick={() => setExpandedKey(isOpen ? null : key)}
                        className='cursor-pointer transition-colors hover:bg-[var(--color-background-subtle)]'
                        title='点击查看关联影片'
                      >
                        <td className='whitespace-nowrap px-4 py-3 text-sm text-[var(--color-foreground)] sm:px-6'>
                          {KIND_LABEL[g.kind] ?? g.kind}
                        </td>
                        <td className='max-w-100 px-4 py-3 text-sm break-all text-[var(--color-foreground)] sm:px-6'>
                          {g.message}
                          <span className='ml-1 text-[11px] text-[var(--color-foreground-muted)]'>
                            {isOpen ? '▲' : '▼'}
                          </span>
                        </td>
                        <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                          {g.count}
                        </td>
                        <td className='whitespace-nowrap px-4 py-3 text-sm text-[var(--color-foreground-muted)] sm:px-6'>
                          {formatTs(g.lastTs)}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td
                            colSpan={4}
                            className='bg-[var(--color-background-subtle)] px-4 py-3 text-xs text-[var(--color-foreground-muted)] sm:px-6'
                          >
                            影片：{g.title || '未知'}
                            {g.videoId ? `（${g.videoId}）` : ''} · 来源：
                            {g.sourceName || '未知'}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagedRecent.length > 0 && (
            <div>
              <div className='px-1 pb-2 text-xs font-medium text-[var(--color-foreground-muted)]'>
                最近上报
              </div>
              <div className='space-y-1.5'>
                {pagedRecent.map((s, i) => (
                  <div
                    key={`${s.ts}-${i}`}
                    className='flex flex-wrap items-baseline gap-x-3 rounded-lg border border-[var(--color-stroke-subtle)] px-3 py-2 text-xs'
                  >
                    <span className='whitespace-nowrap text-[var(--color-foreground-muted)]'>
                      {formatTs(s.ts)}
                    </span>
                    <span className='font-medium text-[var(--color-foreground)]'>
                      {KIND_LABEL[s.kind] ?? s.kind}
                    </span>
                    <span className='min-w-0 flex-1 break-all text-[var(--color-foreground)]'>
                      {s.message}
                    </span>
                    {(s.title || s.sourceName) && (
                      <span className='text-[var(--color-foreground-muted)]'>
                        {[s.title, s.sourceName].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className='px-1 pt-1'>
                <PaginationBar
                  page={recentPage}
                  totalPages={recentTotalPages}
                  total={data.recent.length}
                  pageSize={10}
                  onChange={setRecentPage}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
