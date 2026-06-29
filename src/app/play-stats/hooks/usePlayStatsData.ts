'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { getAuthInfoFromBrowserCookie } from '@/lib/auth';
import { PlayRecord } from '@/lib/types';
import { forceClearWatchingUpdatesCache } from '@/lib/watching-updates';
import {
  useAdminStatsQuery,
  useInvalidatePlayStats,
  useUpcomingReleasesQuery,
  useUserStatsQuery,
} from '@/hooks/usePlayStatsQueries';

export function usePlayStatsData() {
  const router = useRouter();
  const [authInfo, setAuthInfo] = useState<{
    username?: string;
    role?: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuthInfoFromBrowserCookie();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthInfo(auth);
    setIsAdmin(auth?.role === 'admin' || auth?.role === 'owner');
  }, []);

  const {
    data: statsData = null,
    error: adminError,
    isLoading: adminLoading,
  } = useAdminStatsQuery(!!authInfo && isAdmin);

  const {
    data: userStats = null,
    error: userError,
    isLoading: userLoading,
  } = useUserStatsQuery(!!authInfo);

  const { data: upcomingReleases = [], isLoading: upcomingLoading } =
    useUpcomingReleasesQuery(!!authInfo);

  const invalidatePlayStats = useInvalidatePlayStats();

  const loading = isAdmin ? adminLoading || userLoading : userLoading;
  const error = adminError?.message || userError?.message || null;
  const upcomingInitialized = !upcomingLoading;

  useEffect(() => {
    if (!authInfo || !authInfo.username) {
      router.push('/login');
    }
  }, [authInfo, router]);

  useEffect(() => {
    if (
      adminError?.message === 'UNAUTHORIZED' ||
      userError?.message === 'UNAUTHORIZED'
    ) {
      router.push('/login');
    }
  }, [adminError, userError, router]);

  useEffect(() => {
    if (!authInfo) return;

    let updateTimeout: ReturnType<typeof setTimeout> | null = null;
    const handlePlayRecordsUpdate = () => {
      if (updateTimeout) return;
      updateTimeout = setTimeout(() => {
        updateTimeout = null;
      }, 1000);
      forceClearWatchingUpdatesCache();
      invalidatePlayStats();
    };

    window.addEventListener('playRecordsUpdated', handlePlayRecordsUpdate);

    return () => {
      window.removeEventListener('playRecordsUpdated', handlePlayRecordsUpdate);
      if (updateTimeout) clearTimeout(updateTimeout);
    };
  }, [authInfo, invalidatePlayStats]);

  const formatTime = (seconds: number): string => {
    if (seconds === 0) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (hours === 0) {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (timestamp: number): string => {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '时间格式错误';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  const cleanExpiredCache = useCallback(() => {
    const CACHE_DURATION = 2 * 60 * 60 * 1000;
    const now = Date.now();
    const cacheTimeKey = 'upcoming_releases_cache_time';
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (cachedTime) {
      const age = now - parseInt(cachedTime);
      if (age >= CACHE_DURATION) {
        localStorage.removeItem('upcoming_releases_cache');
        localStorage.removeItem(cacheTimeKey);
      }
    }
    const keysToCheck = [
      '5572tv_watching_updates',
      '5572tv_last_update_check',
      'moontv_watching_updates',
      'moontv_last_update_check',
      'release_calendar_all_data',
      'release_calendar_all_data_time',
    ];
    const watchingUpdateTime =
      localStorage.getItem('5572tv_last_update_check') ||
      localStorage.getItem('moontv_last_update_check');
    if (watchingUpdateTime) {
      const WATCHING_CACHE_DURATION = 30 * 60 * 1000;
      const age = now - parseInt(watchingUpdateTime);
      if (age >= WATCHING_CACHE_DURATION) {
        localStorage.removeItem('5572tv_watching_updates');
        localStorage.removeItem('5572tv_last_update_check');
        localStorage.removeItem('moontv_watching_updates');
        localStorage.removeItem('moontv_last_update_check');
      }
    }
    keysToCheck.forEach((key) => {
      if (key.endsWith('_time')) {
        const timeStr = localStorage.getItem(key);
        if (timeStr) {
          const age = now - parseInt(timeStr);
          if (age >= CACHE_DURATION) {
            const dataKey = key.replace('_time', '');
            localStorage.removeItem(dataKey);
            localStorage.removeItem(key);
          }
        }
      }
    });
  }, []);

  const handleRefreshClick = async () => {
    try {
      await invalidatePlayStats();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('刷新数据失败:', error);
    }
  };

  const getProgressPercentage = (
    playTime: number,
    totalTime: number,
  ): number => {
    if (!totalTime || totalTime === 0) return 0;
    return Math.min(Math.round((playTime / totalTime) * 100), 100);
  };

  const handlePlayRecord = (record: PlayRecord) => {
    const searchTitle = record.search_title || record.title;
    const params = new URLSearchParams({
      title: record.title,
      year: record.year,
      stitle: searchTitle,
      stype: record.total_episodes > 1 ? 'tv' : 'movie',
    });
    requestAnimationFrame(() => {
      router.push(`/play?${params.toString()}&_reload=${Date.now()}`);
    });
  };

  const storageType =
    typeof window !== 'undefined' &&
    (window as any).RUNTIME_CONFIG?.STORAGE_TYPE
      ? (window as any).RUNTIME_CONFIG.STORAGE_TYPE
      : 'localstorage';

  return {
    authInfo,
    isAdmin,
    statsData,
    userStats,
    upcomingReleases,
    upcomingInitialized,
    upcomingLoading,
    invalidatePlayStats,
    loading,
    error,
    storageType,
    router,
    formatTime,
    formatDateTime,
    formatDate,
    cleanExpiredCache,
    handleRefreshClick,
    getProgressPercentage,
    handlePlayRecord,
  };
}
