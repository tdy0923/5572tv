'use client';

import { useEffect, useState } from 'react';

/** 用户播放统计列表每页条数 */
export const USER_STATS_PAGE_SIZE = 10;

export function usePlayStatsFilters() {
  const [activeTab, setActiveTab] = useState<'admin' | 'personal'>('admin');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [userQuery, setUserQuery] = useState('');

  const toggleUserExpanded = (username: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const getScrollTop = () => {
      return document.body.scrollTop || document.documentElement.scrollTop || 0;
    };

    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(scrollTop > 300);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    try {
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch {
      document.body.scrollTop = 0;
    }
  };

  return {
    activeTab,
    setActiveTab,
    expandedUsers,
    toggleUserExpanded,
    showBackToTop,
    scrollToTop,
    userQuery,
    setUserQuery,
  };
}
