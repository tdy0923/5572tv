'use client';

import { useState } from 'react';

import { markUpdatesAsViewed } from '@/lib/watching-updates';
import { usePlayStatsWatchingUpdatesQuery } from '@/hooks/usePlayStatsQueries';

export function useContinueWatching(enabled: boolean) {
  const [showWatchingUpdates, setShowWatchingUpdates] = useState(false);

  const { data: watchingUpdates = null } =
    usePlayStatsWatchingUpdatesQuery(enabled);

  const handleWatchingUpdatesClick = () => {
    if (
      watchingUpdates &&
      ((watchingUpdates.updatedCount || 0) > 0 ||
        (watchingUpdates.continueWatchingCount || 0) > 0)
    ) {
      setShowWatchingUpdates(true);
      setTimeout(() => {
        setShowWatchingUpdates(() => {
          return true;
        });
      }, 100);
    }
  };

  const handleCloseWatchingUpdates = () => {
    setShowWatchingUpdates(false);
    markUpdatesAsViewed();
  };

  const formatLastUpdate = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return '刚刚更新';
    if (minutes < 60) return `${minutes}分钟前`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;

    const days = Math.floor(hours / 24);
    return `${days}天前`;
  };

  return {
    watchingUpdates,
    showWatchingUpdates,
    handleWatchingUpdatesClick,
    handleCloseWatchingUpdates,
    formatLastUpdate,
  };
}
