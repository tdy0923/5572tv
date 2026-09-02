/* eslint-disable unused-imports/no-unused-vars */

'use client';

import {
  Activity,
  BarChart3,
  Database,
  HardDrive,
  Inbox,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import AnalyticsPanel from './AnalyticsPanel';

interface PerformanceData {
  metrics: any[];
  recentRequests: {
    timestamp: number;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
    memoryUsed: number;
    dbQueries: number;
    requestSize: number;
    responseSize: number;
  }[];
  currentStatus: {
    system: {
      cpuUsage: number;
      cpuCores: number;
      cpuModel: string;
      memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
        systemTotal: number;
        systemUsed: number;
        systemFree: number;
      };
    };
    requestsPerMinute: number;
    dbQueriesPerMinute: number;
    avgResponseTime: number;
    trafficPerMinute: number;
  };
  externalTraffic: {
    totalRequests: number;
    totalTraffic: number;
    requestTraffic: number;
    responseTraffic: number;
    avgDuration: number;
    byDomain: Record<string, { requests: number; traffic: number }>;
  };
}

interface TopVideoItem {
  title: string;
  source_name: string;
  cover: string;
  year: string;
  playCount: number;
  totalWatchTime: number;
  uniqueUsers: number;
}

// ---------------------------------------------------------------------------
// Fluent helpers
// ---------------------------------------------------------------------------

function FluentKpi({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className='ui-surface rounded-[var(--radius-2xl)] px-4 py-4 sm:px-5 sm:py-5 shadow-[var(--shadow-2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-4)]'>
      <div className='flex items-center justify-between'>
        <span className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]'>
          {label}
        </span>
        <span className='flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-background-subtle)] text-[var(--color-foreground-muted)]'>
          {icon}
        </span>
      </div>
      <div className='mt-2 text-2xl font-semibold tracking-tight text-[var(--color-foreground)] tabular-nums'>
        {value}
      </div>
      <div className='mt-1 text-xs text-[var(--color-foreground-muted)]'>{helper}</div>
    </div>
  );
}

function SkeletonKpi() {
  return (
    <div className='ui-surface rounded-[var(--radius-2xl)] px-5 py-4 shadow-[var(--shadow-2)]'>
      <div className='h-3 w-16 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
      <div className='mt-3 h-7 w-20 rounded-lg bg-[var(--color-background-muted)] animate-pulse' />
      <div className='mt-2 h-3 w-24 rounded-full bg-[var(--color-background-muted)] animate-pulse opacity-60' />
    </div>
  );
}

function FluentEmpty({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className='flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-stroke)] bg-[var(--color-background-subtle)] px-6 py-10 text-center'>
      <span className='flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-background)] text-[var(--color-foreground-muted)] shadow-[var(--shadow-2)]'>
        {icon}
      </span>
      <div className='mt-3 text-sm font-semibold text-[var(--color-foreground)]'>{title}</div>
      <p className='mt-1 max-w-[36ch] text-xs leading-relaxed text-[var(--color-foreground-muted)]'>
        {description}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className='ui-surface rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-2)] group'
      open={defaultOpen}
    >
      <summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-6 hover:bg-[var(--color-background-subtle)] transition-colors [&::-webkit-details-marker]:hidden'>
        <div className='flex items-center gap-2 min-w-0'>
          <h3 className='text-sm font-semibold text-[var(--color-foreground)]'>{title}</h3>
          {badge && (
            <span className='rounded-full border border-[var(--color-stroke)] bg-[var(--color-background)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-foreground-muted)]'>
              {badge}
            </span>
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
      <div className='border-t border-[var(--color-stroke-subtle)] bg-[var(--color-background)]'>
        {children}
      </div>
    </details>
  );
}

export default function PerformanceMonitor() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [playStats, setPlayStats] = useState<{
    topVideos?: TopVideoItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1' | '24'>('1');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [apiFilter, setApiFilter] = useState<string>('all');

  const getApiName = (path: string): string => {
    const apiNames: Record<string, string> = {
      '/api/douban/details': '豆瓣详情',
      '/api/douban/comments': '豆瓣短评',
      '/api/douban/recommends': '豆瓣推荐',
      '/api/douban/categories': '豆瓣分类',
      '/api/douban': '豆瓣搜索',
      '/api/cron': 'Cron 任务',
      '/api/series': '剧集管理',
      '/api/favorites': '收藏管理',
      '/api/playrecords': '播放记录',
      '/api/skipconfigs': '跳过配置',
      '/api/search': '视频搜索',
      '/api/source-browser/list': '视频列表',
      '/api/detail': '视频详情',
      '/api/danmu-external': '弹幕获取',
      '/api/admin': '管理后台',
    };
    if (apiNames[path]) return apiNames[path];
    for (const [prefix, name] of Object.entries(apiNames)) {
      if (path.startsWith(prefix)) return name;
    }
    if (path.startsWith('/api/shortdrama')) return '短剧 API';
    return path;
  };

  const formatTraffic = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes.toFixed(2)} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    } else {
      return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }
  };

  const filterRequestsForStats = (requests: any[]) => {
    if (apiFilter === 'all') return requests;
    return requests.filter((req) => {
      if (apiFilter === 'douban') return req.path.startsWith('/api/douban');
      if (apiFilter === 'shortdrama') return req.path.startsWith('/api/shortdrama');
      if (apiFilter === 'cron') return req.path === '/api/cron';
      if (apiFilter === 'admin') return req.path.startsWith('/api/admin');
      if (apiFilter === 'series') return req.path.startsWith('/api/series');
      if (apiFilter === 'favorites') return req.path.startsWith('/api/favorites');
      if (apiFilter === 'playrecords') return req.path.startsWith('/api/playrecords');
      if (apiFilter === 'skipconfigs') return req.path.startsWith('/api/skipconfigs');
      if (apiFilter === 'search') return req.path.startsWith('/api/search');
      if (apiFilter === 'list') return req.path.startsWith('/api/source-browser/list');
      if (apiFilter === 'detail') return req.path.startsWith('/api/detail');
      if (apiFilter === 'danmu') return req.path.startsWith('/api/danmu-external');
      return true;
    });
  };

  const filterRequestsForDisplay = (requests: any[]) => {
    const filtered = filterRequestsForStats(requests);
    return filtered.slice(0, 100);
  };

  const getFilteredStats = () => {
    if (!data) return null;
    const filteredRequests = filterRequestsForStats(data.recentRequests);
    if (filteredRequests.length === 0) {
      return {
        requestsPerMinute: 0,
        avgResponseTime: 0,
        dbQueriesPerMinute: 0,
        trafficPerMinute: 0,
        isCron: false,
      };
    }
    const minutes = parseInt(timeRange) * 60;
    const requestsPerMinute = Number((filteredRequests.length / minutes).toFixed(2));
    const avgResponseTime = Math.round(
      filteredRequests.reduce((sum: number, r: any) => sum + r.duration, 0) / filteredRequests.length,
    );
    const totalDbQueries = filteredRequests.reduce((sum: number, r: any) => sum + r.dbQueries, 0);
    const dbQueriesPerMinute = Number((totalDbQueries / minutes).toFixed(2));
    const totalTraffic = filteredRequests.reduce(
      (sum: number, r: any) => sum + r.requestSize + r.responseSize,
      0,
    );
    const trafficPerMinute = Number((totalTraffic / minutes).toFixed(2));
    const isCron = apiFilter === 'cron';
    return {
      requestsPerMinute,
      avgResponseTime,
      dbQueriesPerMinute,
      trafficPerMinute,
      isCron,
    };
  };

  const isCronTask = (path: string) => {
    return path.includes('/api/cron') || path.includes('/api/admin/cron');
  };

  const getResponseTimeRating = (avgResponseTime: number, path?: string) => {
    if (path && isCronTask(path)) {
      if (avgResponseTime < 30000) {
        return { level: 'excellent', label: '优秀', color: 'text-green-600 dark:text-green-400', tip: '< 30s' };
      } else if (avgResponseTime < 120000) {
        return { level: 'good', label: '良好', color: 'text-blue-600 dark:text-blue-400', tip: '30s-2min' };
      } else if (avgResponseTime < 300000) {
        return { level: 'fair', label: '正常', color: 'text-yellow-600 dark:text-yellow-400', tip: '2-5min' };
      } else {
        return { level: 'poor', label: '需优化', color: 'text-red-600 dark:text-red-400', tip: '> 5min' };
      }
    }
    if (avgResponseTime < 100) {
      return { level: 'excellent', label: '优秀', color: 'text-green-600 dark:text-green-400', tip: '< 100ms' };
    } else if (avgResponseTime < 200) {
      return { level: 'good', label: '良好', color: 'text-blue-600 dark:text-blue-400', tip: '100-200ms' };
    } else if (avgResponseTime < 2000) {
      return { level: 'fair', label: '可接受', color: 'text-yellow-600 dark:text-yellow-400', tip: '200-2000ms' };
    } else {
      return { level: 'poor', label: '需优化', color: 'text-red-600 dark:text-red-400', tip: '> 2000ms' };
    }
  };

  const getDbQueriesRating = (requestsPerMinute: number, dbQueriesPerMinute: number, path?: string) => {
    if (requestsPerMinute === 0) return { level: 'unknown', label: '无数据', color: 'text-gray-500', tip: '' };
    const queriesPerRequest = dbQueriesPerMinute / requestsPerMinute;
    if (path && isCronTask(path)) {
      if (queriesPerRequest < 50) return { level: 'excellent', label: '优秀', color: 'text-green-600 dark:text-green-400', tip: '< 50次/请求' };
      else if (queriesPerRequest < 100) return { level: 'good', label: '良好', color: 'text-blue-600 dark:text-blue-400', tip: '50-100次/请求' };
      else if (queriesPerRequest < 200) return { level: 'fair', label: '正常', color: 'text-yellow-600 dark:text-yellow-400', tip: '100-200次/请求' };
      else return { level: 'poor', label: '需优化', color: 'text-red-600 dark:text-red-400', tip: '> 200次/请求' };
    }
    if (queriesPerRequest < 5) return { level: 'excellent', label: '优秀', color: 'text-green-600 dark:text-green-400', tip: '< 5次/请求' };
    else if (queriesPerRequest < 10) return { level: 'good', label: '良好', color: 'text-blue-600 dark:text-blue-400', tip: '5-10次/请求' };
    else if (queriesPerRequest < 20) return { level: 'fair', label: '可接受', color: 'text-yellow-600 dark:text-yellow-400', tip: '10-20次/请求' };
    else return { level: 'poor', label: '需优化', color: 'text-red-600 dark:text-red-400', tip: '> 20次/请求' };
  };

  const getTrafficRating = (trafficPerMinute: number) => {
    const trafficKB = trafficPerMinute / 1024;
    if (trafficKB < 10) return { level: 'excellent', label: '非常轻量', color: 'text-green-600 dark:text-green-400', tip: '< 10 KB/分钟' };
    else if (trafficKB < 50) return { level: 'good', label: '轻量', color: 'text-blue-600 dark:text-blue-400', tip: '10-50 KB/分钟' };
    else if (trafficKB < 200) return { level: 'fair', label: '中等', color: 'text-yellow-600 dark:text-yellow-400', tip: '50-200 KB/分钟' };
    else return { level: 'poor', label: '较重', color: 'text-orange-600 dark:text-orange-400', tip: '> 200 KB/分钟' };
  };

  const getExternalTrafficRating = (trafficPerMinute: number) => {
    const trafficMB = trafficPerMinute / 1024 / 1024;
    if (trafficMB < 5) return { level: 'excellent', label: '正常', color: 'text-green-600 dark:text-green-400', tip: '< 5 MB/分钟' };
    else if (trafficMB < 15) return { level: 'good', label: '中等', color: 'text-blue-600 dark:text-blue-400', tip: '5-15 MB/分钟' };
    else if (trafficMB < 30) return { level: 'fair', label: '较高', color: 'text-yellow-600 dark:text-yellow-400', tip: '15-30 MB/分钟' };
    else return { level: 'poor', label: '异常高', color: 'text-red-600 dark:text-red-400', tip: '> 30 MB/分钟' };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/performance?hours=${timeRange}`);
      const playStatsResponse = await fetch('/api/admin/play-stats');
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
      if (playStatsResponse.ok) {
        const statsResult = await playStatsResponse.json();
        setPlayStats(statsResult);
      }
    } catch (error) {
      console.error('获取性能数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async () => {
    if (!confirm('确定要清空所有性能数据吗？')) return;
    try {
      const response = await fetch('/api/admin/performance', { method: 'DELETE' });
      if (response.ok) {
        alert('性能数据已清空');
        fetchData();
      }
    } catch (error) {
      console.error('清空数据失败:', error);
      alert('清空数据失败');
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  if (loading) {
    return (
      <div className='space-y-4 sm:space-y-5'>
        <div className='grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonKpi key={i} />
          ))}
        </div>
        <div className='grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='ui-surface rounded-[var(--radius-2xl)] p-5 shadow-[var(--shadow-2)]'>
              <div className='h-3 w-20 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
              <div className='mt-3 h-6 w-24 rounded-lg bg-[var(--color-background-muted)] animate-pulse' />
              <div className='mt-2 h-3 w-32 rounded-full bg-[var(--color-background-muted)] animate-pulse opacity-60' />
            </div>
          ))}
        </div>
        <div className='ui-surface rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-2)]'>
          <div className='h-4 w-32 rounded-full bg-[var(--color-background-muted)] animate-pulse' />
          <div className='mt-4 space-y-2'>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className='h-12 rounded-[var(--radius-xl)] bg-[var(--color-background-muted)] animate-pulse'
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <FluentEmpty
        icon={<Activity size={20} />}
        title='暂无性能数据'
        description='性能数据将在产生请求后自动采集，稍后刷新即可查看。'
      />
    );
  }

  const filteredStats = getFilteredStats();
  const filteredRequests = filterRequestsForStats(data.recentRequests);

  const topPaths = Object.entries(
    filteredRequests.reduce<Record<string, number>>((acc, req: any) => {
      const path = req.path || '/';
      acc[path] = (acc[path] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const errorPaths = Object.entries(
    filteredRequests
      .filter((req: any) => req.statusCode >= 400)
      .reduce<Record<string, number>>((acc, req: any) => {
        const path = req.path || '/';
        acc[path] = (acc[path] || 0) + 1;
        return acc;
      }, {}),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const statusGroups = filteredRequests.reduce<Record<string, number>>((acc, req: any) => {
    const code = String(req.statusCode || 0);
    const key = code.startsWith('2')
      ? '2xx'
      : code.startsWith('3')
        ? '3xx'
        : code.startsWith('4')
          ? '4xx'
          : code.startsWith('5')
            ? '5xx'
            : 'other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className='space-y-5 sm:space-y-6'>
      {/* 工具栏 */}
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h2 className='text-lg font-semibold tracking-tight text-[var(--color-foreground)]'>性能监控</h2>
          <p className='mt-1 text-xs text-[var(--color-foreground-muted)]'>
            实时请求、资源与外部流量的 Fluent 概览 · 筛选后数据实时重算
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1' | '24')}
            className='rounded-full border border-[var(--color-stroke)] bg-[var(--color-background)] px-3.5 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-[var(--shadow-2)] focus:border-[var(--color-primary-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)]'
            aria-label='时间范围'
          >
            <option value='1'>最近 1 小时</option>
            <option value='24'>最近 24 小时</option>
          </select>
          <select
            value={apiFilter}
            onChange={(e) => setApiFilter(e.target.value)}
            className='rounded-full border border-[var(--color-stroke)] bg-[var(--color-background)] px-3.5 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-[var(--shadow-2)] focus:border-[var(--color-primary-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)]'
            aria-label='API 筛选'
          >
            <option value='all'>全部 API</option>
            <option value='douban'>豆瓣 API</option>
            <option value='shortdrama'>短剧 API</option>
            <option value='search'>视频搜索</option>
            <option value='list'>视频列表</option>
            <option value='detail'>视频详情</option>
            <option value='danmu'>弹幕获取</option>
            <option value='favorites'>收藏管理</option>
            <option value='playrecords'>播放记录</option>
            <option value='skipconfigs'>跳过配置</option>
            <option value='cron'>Cron 任务</option>
            <option value='series'>剧集管理</option>
            <option value='admin'>管理后台</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium shadow-[var(--shadow-2)] transition-colors ${
              autoRefresh
                ? 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]'
                : 'border border-[var(--color-stroke)] bg-[var(--color-background)] text-[var(--color-foreground)] hover:bg-[var(--color-background-subtle)]'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            自动刷新
          </button>
          <button
            onClick={fetchData}
            className='inline-flex items-center gap-1.5 rounded-full bg-[var(--color-foreground)] px-3.5 py-2 text-sm font-medium text-white shadow-[var(--shadow-2)] hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-colors'
          >
            <RefreshCw className='h-4 w-4' />
            刷新
          </button>
          <button
            onClick={clearData}
            className='inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 transition-colors'
          >
            <Trash2 className='h-4 w-4' />
            清空数据
          </button>
        </div>
      </div>

      {/* 总览摘要 */}
      <div className='grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <FluentKpi
          label='总请求'
          value={data.recentRequests.length}
          helper={`最近 ${timeRange === '1' ? '1 小时' : '24 小时'} · 已筛选 ${filteredRequests.length}`}
          icon={<Activity className='h-4 w-4 text-[#107c10]' />}
        />
        <FluentKpi
          label='平均响应'
          value={`${filteredStats?.avgResponseTime ?? 0}ms`}
          helper='接口平均耗时'
          icon={<Zap className='h-4 w-4 text-[#d83b01]' />}
        />
        <FluentKpi
          label='外部流量'
          value={data?.externalTraffic ? formatTraffic(data.externalTraffic.totalTraffic) : '0.00 B'}
          helper={`${data?.externalTraffic?.totalRequests || 0} 次外部请求`}
          icon={<Database className='h-4 w-4 text-[#5c2d91]' />}
        />
        <FluentKpi
          label='资源状态'
          value={`${data.currentStatus.system.cpuUsage.toFixed(1)}%`}
          helper='CPU · 内存 · DB 负载'
          icon={<HardDrive className='h-4 w-4 text-[#0f6cbd]' />}
        />
      </div>

      {/* 详细性能状态 */}
      <div className='grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-3'>
        <div className='ui-surface rounded-[var(--radius-2xl)] px-5 py-5 shadow-[var(--shadow-2)]'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]'>
            进程内存
          </div>
          <div className='mt-2 text-xl font-semibold tabular-nums text-[var(--color-foreground)]'>
            {formatTraffic(data.currentStatus.system.memoryUsage.rss * 1024 * 1024)}
          </div>
          <div className='mt-1 text-xs text-[var(--color-foreground-muted)]'>
            堆内存 {formatTraffic(data.currentStatus.system.memoryUsage.heapUsed * 1024 * 1024)} /{' '}
            {formatTraffic(data.currentStatus.system.memoryUsage.heapTotal * 1024 * 1024)}
          </div>
        </div>
        <div className='ui-surface rounded-[var(--radius-2xl)] px-5 py-5 shadow-[var(--shadow-2)]'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]'>
            系统内存
          </div>
          <div className='mt-2 text-xl font-semibold tabular-nums text-[var(--color-foreground)]'>
            {formatTraffic(data.currentStatus.system.memoryUsage.systemUsed * 1024 * 1024)}
          </div>
          <div className='mt-1 text-xs text-[var(--color-foreground-muted)]'>
            总共 {formatTraffic(data.currentStatus.system.memoryUsage.systemTotal * 1024 * 1024)}
          </div>
        </div>
        <div className='ui-surface rounded-[var(--radius-2xl)] px-5 py-5 shadow-[var(--shadow-2)]'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]'>
            数据库负载
          </div>
          <div className='mt-2 text-xl font-semibold tabular-nums text-[var(--color-foreground)]'>
            {filteredStats?.dbQueriesPerMinute ?? 0}
          </div>
          <div className='mt-1 text-xs text-[var(--color-foreground-muted)]'>
            {filteredStats && filteredStats.requestsPerMinute > 0
              ? `${(filteredStats.dbQueriesPerMinute / filteredStats.requestsPerMinute).toFixed(1)} 次/请求`
              : '暂无数据'}
          </div>
        </div>
      </div>

      {/* 外部流量详情 */}
      {data?.externalTraffic && data.externalTraffic.totalRequests > 0 && (
        <SectionCard title='外部流量详情（按域名）' badge={`${Object.keys(data.externalTraffic.byDomain).length} 域名`}>
          <div className='overflow-x-auto'>
            <table className='min-w-full'>
              <thead>
                <tr className='border-b border-[var(--color-stroke-subtle)] bg-[var(--color-background-subtle)]'>
                  {['域名', '请求次数', '总流量', '平均流量/请求'].map((h) => (
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
                {Object.entries(data.externalTraffic.byDomain)
                  .sort((a, b) => b[1].traffic - a[1].traffic)
                  .map(([domain, stats]) => (
                    <tr key={domain} className='hover:bg-[var(--color-background-subtle)] transition-colors'>
                      <td className='whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--color-foreground)] sm:px-6'>
                        {domain}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                        {stats.requests}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                        {formatTraffic(stats.traffic)}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                        {formatTraffic(stats.traffic / stats.requests)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* 用户行为分析 */}
      <SectionCard title='用户行为分析' badge='最近 30 天'>
        <div className='p-4 sm:p-6'>
          <AnalyticsPanel autoRefresh={autoRefresh} />
        </div>
      </SectionCard>

      {/* 热门点播影片 */}
      {playStats?.topVideos && playStats.topVideos.length > 0 && (
        <SectionCard title='热门点播影片' badge={`${playStats.topVideos.length} 项`} defaultOpen>
          <div className='overflow-x-auto'>
            <table className='min-w-full'>
              <thead>
                <tr className='border-b border-[var(--color-stroke-subtle)] bg-[var(--color-background-subtle)]'>
                  {['影片', '来源', '播放次数', '观看用户', '累计时长'].map((h) => (
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
                {playStats.topVideos.map((video, index) => (
                  <tr key={`${video.title}-${index}`} className='hover:bg-[var(--color-background-subtle)] transition-colors'>
                    <td className='px-4 py-3 sm:px-6'>
                      <div className='text-sm font-medium text-[var(--color-foreground)]'>{video.title}</div>
                      <div className='text-xs text-[var(--color-foreground-muted)]'>{video.year || '未知年份'}</div>
                    </td>
                    <td className='whitespace-nowrap px-4 py-3 text-sm text-[var(--color-foreground)] sm:px-6'>
                      {video.source_name || '未知来源'}
                    </td>
                    <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                      {video.playCount}
                    </td>
                    <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                      {video.uniqueUsers}
                    </td>
                    <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                      {Math.round(video.totalWatchTime / 60)} 分钟
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* 热门路径 */}
      {topPaths.length > 0 ? (
        <SectionCard title='热门路径' badge={`${topPaths.length} 项`}>
          <div className='px-4 py-4 sm:px-6 space-y-2'>
            {topPaths.map(([path, count]) => (
              <div
                key={path}
                className='flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[var(--color-stroke-subtle)] bg-[var(--color-background-subtle)] px-4 py-3 transition-colors hover:bg-[var(--color-background-muted)]'
              >
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium text-[var(--color-foreground)]'>{getApiName(path)}</div>
                  <div className='truncate text-xs text-[var(--color-foreground-muted)]'>{path}</div>
                </div>
                <span className='shrink-0 rounded-full bg-[var(--color-foreground)] px-2.5 py-1 text-xs font-semibold tabular-nums text-white dark:bg-white dark:text-black'>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <div className='ui-surface rounded-[var(--radius-2xl)] p-4 shadow-[var(--shadow-2)]'>
          <FluentEmpty
            icon={<BarChart3 size={18} />}
            title='暂无热门路径'
            description='筛选条件下无请求命中，或时间范围内尚无数据。'
          />
        </div>
      )}

      {/* 错误接口排行 */}
      {errorPaths.length > 0 && (
        <SectionCard title='错误接口排行' badge={`${errorPaths.length} 项`} defaultOpen>
          <div className='px-4 py-4 sm:px-6 space-y-2'>
            {errorPaths.map(([path, count]) => (
              <div
                key={path}
                className='flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20'
              >
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium text-red-700 dark:text-red-300'>{getApiName(path)}</div>
                  <div className='truncate text-xs text-red-600/70 dark:text-red-300/70'>{path}</div>
                </div>
                <span className='shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold tabular-nums text-white'>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 最近请求列表 */}
      <SectionCard title='最近请求（最新 100 条）' badge={`${filterRequestsForDisplay(data.recentRequests).length} 条`}>
        {filterRequestsForDisplay(data.recentRequests).length === 0 ? (
          <div className='p-4 sm:p-6'>
            <FluentEmpty
              icon={<Inbox size={18} />}
              title='无匹配请求'
              description='当前筛选条件下没有最近请求，尝试切换“全部 API”或更换时间范围。'
            />
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full'>
              <thead>
                <tr className='border-b border-[var(--color-stroke-subtle)] bg-[var(--color-background-subtle)]'>
                  {['时间', 'API 名称', '状态码', '响应时间', '内存', 'DB 查询', '响应大小'].map((h) => (
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
                {filterRequestsForDisplay(data.recentRequests).map((request: any, index: number) => {
                  const responseSizeKB = (request.responseSize / 1024).toFixed(2);
                  const isSuccess = request.statusCode >= 200 && request.statusCode < 300;
                  const isError = request.statusCode >= 400;
                  return (
                    <tr key={request.timestamp + '-' + index} className='hover:bg-[var(--color-background-subtle)] transition-colors'>
                      <td className='whitespace-nowrap px-4 py-3 text-xs tabular-nums text-[var(--color-foreground)] sm:px-6'>
                        {new Date(request.timestamp).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--color-foreground)] sm:px-6'>
                        {getApiName(request.path)}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm sm:px-6'>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                            isSuccess
                              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                              : isError
                                ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                          }`}
                        >
                          {request.statusCode}
                        </span>
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                        {request.duration}ms
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                        {request.memoryUsed.toFixed(2)} MB
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                        {request.dbQueries > 0 ? request.dbQueries : '—'}
                      </td>
                      <td className='whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[var(--color-foreground)] sm:px-6'>
                        {responseSizeKB} KB
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
