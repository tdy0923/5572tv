'use client';

import {
  AlertTriangle,
  BarChart3,
  Clock,
  FileText,
  Film,
  Folder,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  FluentBadge,
  FluentButton,
  FluentCard,
  FluentEmptyState,
  FluentSpinner,
} from '@/components/FluentUI';

interface CacheStats {
  douban: { count: number; size: number; types: Record<string, number> };
  shortdrama: { count: number; size: number; types: Record<string, number> };
  tmdb: { count: number; size: number; types: Record<string, number> };
  danmu: { count: number; size: number };
  netdisk: { count: number; size: number };
  search: { count: number; size: number };
  other: { count: number; size: number };
  total: { count: number; size: number };
  timestamp: string;
  formattedSizes: {
    douban: string;
    shortdrama: string;
    tmdb: string;
    danmu: string;
    netdisk: string;
    search: string;
    other: string;
    total: string;
  };
}

interface CacheType {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const CACHE_TYPES: CacheType[] = [
  {
    key: 'douban',
    name: '豆瓣数据',
    description: '电影/电视剧详情、分类、推荐等数据缓存',
    icon: Film,
    color: 'text-green-600 bg-green-100',
  },
  {
    key: 'shortdrama',
    name: '短剧数据',
    description: '短剧分类、推荐、列表、集数等数据缓存',
    icon: Play,
    color: 'text-orange-600 bg-orange-100',
  },
  {
    key: 'tmdb',
    name: 'TMDB数据',
    description: 'TMDB演员搜索、作品信息等数据缓存',
    icon: Film,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    key: 'danmu',
    name: '弹幕数据',
    description: '外部弹幕API获取的弹幕内容缓存',
    icon: FileText,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    key: 'netdisk',
    name: '网盘搜索',
    description: '网盘搜索结果缓存（百度、阿里、夸克等）',
    icon: Folder,
    color: 'text-purple-600 bg-purple-100',
  },
];

export default function CacheManager() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // 获取缓存统计
  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/cache');
      if (!response.ok) throw new Error('获取缓存统计失败');

      const result = await response.json();
      if (result.success) {
        setStats(result.data);
        setLastRefresh(new Date());
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取缓存统计失败');
    } finally {
      setLoading(false);
    }
  };

  // 清理缓存
  const clearCache = async (type: string) => {
    if (
      !confirm(
        `确定要清理${CACHE_TYPES.find((t) => t.key === type)?.name || type}缓存吗？`,
      )
    ) {
      return;
    }

    setClearing(type);
    setError(null);

    try {
      const response = await fetch(`/api/admin/cache?type=${type}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('清理缓存失败');

      const result = await response.json();
      if (result.success) {
        // 清理成功后刷新统计
        await fetchStats();

        // 显示成功消息
        const message = result.data.message;
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent('globalSuccess', {
              detail: { message },
            }),
          );
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '清理缓存失败');
    } finally {
      setClearing(null);
    }
  };

  // 清理过期缓存
  const clearExpiredCache = async () => {
    await clearCache('expired');
  };

  // 清理所有缓存
  const clearAllCache = async () => {
    if (
      !confirm(
        '确定要清理所有缓存吗？这将清除豆瓣、短剧、TMDB、弹幕、网盘搜索等所有缓存数据。',
      )
    ) {
      return;
    }
    await clearCache('all');
  };

  // 组件加载时获取统计
  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3
            className='text-[15px] font-semibold'
            style={{ color: 'var(--color-foreground)' }}
          >
            缓存管理
          </h3>
          <p
            className='text-xs mt-0.5 flex items-center gap-1.5'
            style={{ color: 'var(--color-foreground-muted)' }}
          >
            命中、大小与清理
            {lastRefresh && (
              <span className='inline-flex items-center gap-1 text-xs text-[#9ca3af]'>
                <Clock className='w-3 h-3' />
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <FluentButton
          variant='secondary'
          size='sm'
          icon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
          loading={loading}
          onClick={fetchStats}
        >
          刷新
        </FluentButton>
      </div>

      {/* Error */}
      {error && (
        <FluentCard
          padding='12px'
          className='flex items-center gap-2 border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300'
        >
          <AlertTriangle className='h-4 w-4 shrink-0' />
          <span className='text-sm'>{error}</span>
        </FluentCard>
      )}

      {/* Overview */}
      {stats && (
        <FluentCard
          padding='16px'
          className='bg-gradient-to-r from-[#3b82f6] to-[#6366f1] !border-transparent text-white'
        >
          <div className='flex items-center gap-2 mb-3'>
            <BarChart3 className='w-4 h-4 text-white/90' />
            <span className='text-sm font-semibold text-white'>总览</span>
            <FluentBadge variant='default' size='sm' rounded className='!bg-white/20 !text-white !border-white/20'>
              {stats.timestamp ? new Date(stats.timestamp).toLocaleString() : ''}
            </FluentBadge>
          </div>
          <div className='grid grid-cols-3 gap-4 text-center'>
            <div>
              <div className='text-2xl font-bold'>{stats.total.count}</div>
              <div className='text-xs text-white/80'>缓存项总数</div>
            </div>
            <div>
              <div className='text-2xl font-bold'>{stats.formattedSizes.total}</div>
              <div className='text-xs text-white/80'>占用存储</div>
            </div>
            <div>
              <div className='text-2xl font-bold'>{CACHE_TYPES.length}</div>
              <div className='text-xs text-white/80'>缓存类型</div>
            </div>
          </div>
        </FluentCard>
      )}

      {/* Cache types */}
      {stats && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          {CACHE_TYPES.map((cacheType) => {
            const typeStats = stats[cacheType.key as keyof typeof stats] as any;
            const Icon = cacheType.icon;
            const isClearing = clearing === cacheType.key;
            const count = typeStats?.count || 0;
            const size =
              stats.formattedSizes[
                cacheType.key as keyof typeof stats.formattedSizes
              ];

            return (
              <FluentCard key={cacheType.key} hoverable padding='16px' className='space-y-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-start gap-3'>
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cacheType.color}`}>
                      <Icon className='h-4 w-4' />
                    </span>
                    <div>
                      <h4 className='text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5'>
                        {cacheType.name}
                        <FluentBadge
                          variant={count > 0 ? 'info' : 'default'}
                          size='sm'
                          rounded
                        >
                          {count} 项
                        </FluentBadge>
                      </h4>
                      <p className='text-xs text-[#9ca3af] mt-0.5 leading-relaxed'>
                        {cacheType.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <div className='text-center p-2.5 rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5'>
                    <div className='text-base font-semibold text-gray-900 dark:text-white'>
                      {count}
                    </div>
                    <div className='text-[11px] text-[#9ca3af]'>缓存项</div>
                  </div>
                  <div className='text-center p-2.5 rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5'>
                    <div className='text-base font-semibold text-gray-900 dark:text-white'>
                      {size}
                    </div>
                    <div className='text-[11px] text-[#9ca3af]'>存储大小</div>
                  </div>
                </div>

                {typeStats?.types && Object.keys(typeStats.types).length > 0 && (
                  <div className='space-y-1 rounded-xl border bg-gray-50 dark:bg-white/[0.03] border-gray-200 dark:border-white/5 p-3'>
                    <div className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                      类型分布
                    </div>
                    {Object.entries(typeStats.types).map(([type, cnt]) => (
                      <div key={type} className='flex justify-between text-xs'>
                        <span className='text-[#9ca3af]'>{type}</span>
                        <FluentBadge variant='default' size='sm' rounded>
                          {cnt as number}
                        </FluentBadge>
                      </div>
                    ))}
                  </div>
                )}

                <FluentButton
                  variant='danger'
                  size='sm'
                  fullWidth
                  icon={<Trash2 className='h-4 w-4' />}
                  loading={isClearing}
                  disabled={count === 0}
                  onClick={() => clearCache(cacheType.key)}
                >
                  {isClearing ? '清理中...' : '清理缓存'}
                </FluentButton>
              </FluentCard>
            );
          })}
        </div>
      )}

      {/* Batch */}
      {stats && (
        <FluentCard padding='16px' className='space-y-3'>
          <div className='flex items-center gap-2'>
            <span className='w-7 h-7 rounded-lg bg-[#f59e0b]/15 flex items-center justify-center'>
              <Trash2 className='w-3.5 h-3.5 text-[#f59e0b]' />
            </span>
            <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>
              批量操作
            </h4>
            <FluentBadge variant='default' size='sm' rounded>
              危险操作
            </FluentBadge>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <FluentButton
              variant='secondary'
              size='md'
              icon={<Clock className='h-4 w-4' />}
              loading={clearing === 'expired'}
              onClick={clearExpiredCache}
            >
              {clearing === 'expired' ? '清理中...' : '清理过期缓存'}
            </FluentButton>
            <FluentButton
              variant='danger'
              size='md'
              icon={<Trash2 className='h-4 w-4' />}
              loading={clearing === 'all'}
              onClick={clearAllCache}
            >
              {clearing === 'all' ? '清理中...' : '清理所有缓存'}
            </FluentButton>
          </div>

          <FluentCard
            padding='10px'
            className='flex gap-2 border bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/30'
          >
            <AlertTriangle className='h-4 w-4 text-[#f59e0b] shrink-0 mt-0.5' />
            <p className='text-xs leading-relaxed text-amber-800 dark:text-amber-200'>
              清理后数据需重新从源服务器获取，可能影响加载速度。
            </p>
          </FluentCard>
        </FluentCard>
      )}

      {/* Loading */}
      {loading && !stats && (
        <FluentCard padding='16px'>
          <FluentEmptyState
            icon={<FluentSpinner size='medium' />}
            title='正在获取缓存统计...'
            description='请稍候，正在汇总各类型缓存'
          />
        </FluentCard>
      )}
    </div>
  );
}
