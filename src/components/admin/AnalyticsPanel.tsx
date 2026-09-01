'use client';

import {
  Activity,
  Clock,
  Download,
  Heart,
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

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
      <div className='flex items-center justify-between mb-2'>
        <span className='text-sm text-gray-600 dark:text-gray-400'>
          {label}
        </span>
        {icon}
      </div>
      <div className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
        {value}
      </div>
    </div>
  );
}

function TrendChart({ daily }: { daily: AnalyticsSummary['daily'] }) {
  const items = daily.slice(-14);
  const max = Math.max(...items.map((d) => d.pv), 1);
  return (
    <div className='flex items-end gap-1.5 h-28'>
      {items.map((d) => (
        <div
          key={d.date}
          className='flex-1 flex flex-col items-center justify-end h-full gap-1'
          title={`${d.date} PV:${d.pv} UV:${d.uv}`}
        >
          <div
            className='w-full rounded-t bg-blue-500 dark:bg-blue-600'
            style={{ height: `${Math.max((d.pv / max) * 100, 3)}%` }}
          />
          <span className='text-[9px] text-gray-500 dark:text-gray-400 leading-none whitespace-nowrap'>
            {d.date.slice(5)}
          </span>
        </div>
      ))}
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
    <details
      className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden'
      open
    >
      <summary className='px-4 sm:px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'>
        <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200 inline'>
          {title}
        </h3>
        <span className='ml-2 text-xs text-gray-400'>共 {items.length} 项</span>
      </summary>
      <div className='border-t border-gray-200 dark:border-gray-700'>
        <div className='px-4 sm:px-6 py-3 space-y-2'>
          {items.map((item, index) => (
            <div key={index} className='flex items-center gap-3 text-sm'>
              <span className='w-6 text-right font-mono text-xs text-gray-400'>
                {index + 1}
              </span>
              <div className='flex-1 min-w-0'>{render(item, index)}</div>
              <span className='text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                {item.count} 次
              </span>
            </div>
          ))}
          {items.length === 0 && (
            <div className='text-sm text-gray-400'>暂无数据</div>
          )}
        </div>
      </div>
    </details>
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

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?days=${DAYS}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
        // 如果行为数据为空，尝试用播放记录兜底展示“用户实际看了什么”
        if (
          json.data &&
          (json.data.totals.plays === 0 || json.data.topVideos.length === 0)
        ) {
          try {
            const r2 = await fetch('/api/admin/play-stats');
            if (r2.ok) {
              const j2 = await r2.json();
              // play-stats 返回按用户聚合的播放统计，这里简单取最热影片做兜底
              const list: { videoId: string; title: string; count: number }[] =
                [];
              // 兼容两种返回结构
              const src = j2.data || j2;
              // play-stats returns {title, playCount, source_name} while analytics uses {videoId, title, count}
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

  if (loading) {
    return (
      <div className='flex justify-center items-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600' />
      </div>
    );
  }

  if (!data) {
    return (
      <div className='text-center py-8 text-gray-500'>
        暂无用户行为数据（事件将在用户访问后产生）
      </div>
    );
  }

  const t = data.totals;
  const showFallback = fallbackVideos && fallbackVideos.length > 0;

  return (
    <div className='space-y-4'>
      {/* 汇总卡片 */}
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
        <KpiCard
          label='页面访问 PV'
          value={t.pv}
          icon={<Activity className='w-4 h-4 text-blue-500' />}
        />
        <KpiCard
          label='独立访客 UV'
          value={t.uv}
          icon={<Users className='w-4 h-4 text-green-500' />}
        />
        <KpiCard
          label='活跃用户'
          value={t.activeUsers}
          icon={<TrendingUp className='w-4 h-4 text-purple-500' />}
        />
        <KpiCard
          label='登录次数'
          value={t.logins}
          icon={<Clock className='w-4 h-4 text-orange-500' />}
        />
        <KpiCard
          label='播放次数'
          value={t.plays}
          icon={<Activity className='w-4 h-4 text-cyan-500' />}
        />
        <KpiCard
          label='搜索次数'
          value={t.searches}
          icon={<Search className='w-4 h-4 text-pink-500' />}
        />
        <KpiCard
          label='收藏次数'
          value={t.favorites}
          icon={<Heart className='w-4 h-4 text-red-500' />}
        />
        <KpiCard
          label='APP 下载'
          value={t.downloads}
          icon={<Download className='w-4 h-4 text-indigo-500' />}
        />
      </div>

      {/* 近 14 天 PV/UV 趋势 */}
      <details
        className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden'
        open
      >
        <summary className='px-4 sm:px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'>
          <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200 inline'>
            近 14 天访问趋势
          </h3>
        </summary>
        <div className='border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4'>
          <TrendChart daily={data.daily} />
        </div>
      </details>

      {/* 行为 Top 榜单 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <TopList
          title='热门访问页面'
          items={data.topPages}
          render={(item) => (
            <a
              href={item.path}
              className='text-blue-600 dark:text-blue-400 hover:underline truncate block'
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
              className='text-blue-600 dark:text-blue-400 hover:underline truncate block'
              title={`搜索 ${item.query}`}
            >
              {item.query}
            </a>
          )}
        />
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
                <div className='text-blue-600 dark:text-blue-400 hover:underline truncate'>
                  {title}
                </div>
                <div className='text-xs text-gray-400 truncate'>
                  {vid}
                </div>
              </a>
            );
          }}
        />
        {showFallback && (
          <div className='text-xs text-amber-600 dark:text-amber-400 -mt-2'>
            行为统计暂无播放数据，已降级展示播放记录中的热门影片（修复后新播放才会进入行为统计）
          </div>
        )}
        <TopList
          title='下载渠道'
          items={data.topDownloads}
          render={(item) => (
            <span className='text-gray-700 dark:text-gray-300 truncate block'>
              {item.apk}
            </span>
          )}
        />
      </div>

      {/* 活跃用户表 */}
      <details
        className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden'
        open
      >
        <summary className='px-4 sm:px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'>
          <h3 className='text-lg font-semibold text-gray-800 dark:text-gray-200 inline'>
            活跃用户（最近 {DAYS} 天）
          </h3>
        </summary>
        <div className='border-t border-gray-200 dark:border-gray-700 overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'>
            <thead className='bg-gray-50 dark:bg-gray-700'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                  用户
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                  访问
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                  播放
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                  搜索
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                  收藏
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                  下载
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase'>
                  最后活跃
                </th>
              </tr>
            </thead>
            <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
              {data.users.map((u) => (
                <tr key={u.uid}>
                  <td className='px-6 py-3 text-sm font-medium text-gray-900 dark:text-gray-100'>
                    {u.uid}
                  </td>
                  <td className='px-6 py-3 text-sm text-gray-900 dark:text-gray-100'>
                    {u.pv}
                  </td>
                  <td className='px-6 py-3 text-sm text-gray-900 dark:text-gray-100'>
                    {u.plays}
                  </td>
                  <td className='px-6 py-3 text-sm text-gray-900 dark:text-gray-100'>
                    {u.searches}
                  </td>
                  <td className='px-6 py-3 text-sm text-gray-900 dark:text-gray-100'>
                    {u.favorites}
                  </td>
                  <td className='px-6 py-3 text-sm text-gray-900 dark:text-gray-100'>
                    {u.downloads}
                  </td>
                  <td className='px-6 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                    {new Date(u.lastActive).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
              {data.users.length === 0 && (
                <tr>
                  <td colSpan={7} className='px-6 py-4 text-sm text-gray-400'>
                    暂无已登录用户行为数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
