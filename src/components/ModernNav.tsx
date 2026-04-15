'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';
import {
  Cat,
  Clover,
  Film,
  FolderOpen,
  Globe,
  Home,
  MoreHorizontal,
  PlaySquare,
  Radio,
  Search,
  Sparkles,
  Star,
  Tv,
  X,
} from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { FastLink } from './FastLink';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface NavItem {
  icon: any;
  label: string;
  href: string;
}

interface ModernNavProps {
  showAIButton?: boolean;
  onAIButtonClick?: () => void;
}

// Query Options 工厂函数
const userEmbyConfigOptions = () =>
  queryOptions({
    queryKey: ['user', 'emby-config'],
    queryFn: async () => {
      const res = await fetch('/api/user/emby-config');
      if (!res.ok) return null;
      const data = await res.json();
      return data.config;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

const publicSourcesOptions = () =>
  queryOptions({
    queryKey: ['emby', 'public-sources'],
    queryFn: async () => {
      const res = await fetch('/api/emby/public-sources');
      if (!res.ok) return { sources: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

export default function ModernNav({
  showAIButton = false,
  onAIButtonClick,
}: ModernNavProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { siteName } = useSite();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const baseMenuItems: NavItem[] = [
    {
      icon: Home,
      label: '首页',
      href: '/',
    },
    {
      icon: Search,
      label: '搜索',
      href: '/search',
    },
    {
      icon: Globe,
      label: '源浏览器',
      href: '/source-browser',
    },
    {
      icon: Film,
      label: '电影',
      href: '/douban?type=movie',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
    },
    {
      icon: PlaySquare,
      label: '短剧',
      href: '/shortdrama',
    },
    {
      icon: Cat,
      label: '动漫',
      href: '/douban?type=anime',
    },
    {
      icon: Clover,
      label: '综艺',
      href: '/douban?type=show',
    },
  ];

  // 检查用户是否配置了 Emby
  const { data: userEmbyConfig } = useQuery(userEmbyConfigOptions());

  // 检查管理员是否设置了公共源
  const { data: publicSourcesData } = useQuery(publicSourcesOptions());

  const active = useMemo(() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);

  const menuItems = useMemo(() => {
    const runtimeConfig =
      typeof window !== 'undefined'
        ? (window as any).RUNTIME_CONFIG
        : undefined;
    const newItems = [...baseMenuItems];

    if (runtimeConfig?.ENABLE_WEB_LIVE) {
      newItems.push({
        icon: Radio,
        label: '直播',
        href: '/live',
      });
    }

    if (runtimeConfig?.CUSTOM_CATEGORIES?.length > 0) {
      newItems.push({
        icon: Star,
        label: '自定义',
        href: '/douban?type=custom',
      });
    }

    const hasUserEmby = userEmbyConfig?.sources?.some(
      (s: any) => s.enabled && s.ServerURL,
    );
    const hasPublicEmby = (publicSourcesData?.sources?.length ?? 0) > 0;
    if (hasUserEmby || hasPublicEmby) {
      newItems.push({
        icon: FolderOpen,
        label: 'Emby',
        href: '/emby',
      });
    }

    return newItems;
  }, [baseMenuItems, userEmbyConfig, publicSourcesData]);

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];
    const decodedActive = decodeURIComponent(active);
    const decodedHref = decodeURIComponent(href);

    return (
      decodedActive === decodedHref ||
      (decodedActive.startsWith('/douban') &&
        typeMatch &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <>
      {/* Desktop Top Navigation - 2025 Disney+ Style */}
      <nav className='hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/92 dark:bg-[#111111]/90 backdrop-blur-xl border-b border-[#ece7da] dark:border-white/8 shadow-[0_12px_30px_rgba(0,0,0,0.05)]'>
        <div className='max-w-[2560px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20'>
          <div className='flex items-center justify-between h-16 gap-4'>
            {/* Logo */}
            <FastLink href='/' className='shrink-0'>
              <div className='text-xl font-bold bg-linear-to-r from-[#111111] via-[#2a2a2a] to-[#b78415] dark:from-white dark:via-[#f4f4f4] dark:to-[#f4c24d] bg-clip-text text-transparent'>
                {siteName}
              </div>
            </FastLink>

            {/* Navigation Items */}
            <div className='flex items-center justify-center gap-1 lg:gap-2 overflow-x-auto scrollbar-hide flex-1 px-4'>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <FastLink
                    key={item.label}
                    href={item.href}
                    useTransitionNav
                    className='group relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full transition-all duration-300 hover:bg-[#f8f5ec] dark:hover:bg-white/6 whitespace-nowrap shrink-0'
                  >
                    {/* Active indicator */}
                    {active && (
                      <div className='absolute inset-0 bg-linear-to-r from-[#f4c24d]/20 to-[#fff6de]/65 rounded-full' />
                    )}

                    {/* Icon */}
                    <div className='relative'>
                      <Icon
                        className={`w-5 h-5 transition-all duration-300 ${
                          active
                            ? 'text-[#171717] dark:text-[#fff6de]'
                            : 'text-gray-600 dark:text-gray-400 group-hover:text-[#171717] dark:group-hover:text-gray-100'
                        } ${active ? 'scale-110' : 'group-hover:scale-110'}`}
                      />
                    </div>

                    {/* Label */}
                    <span
                      className={`text-sm font-medium transition-all duration-300 ${
                        active
                          ? 'text-[#171717] dark:text-[#fff6de] font-semibold'
                          : 'text-gray-700 dark:text-gray-300 group-hover:text-[#171717] dark:group-hover:text-gray-100'
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* Bottom active border */}
                    {active && (
                      <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-[#f4c24d] to-[#c89422] rounded-full' />
                    )}
                  </FastLink>
                );
              })}
            </div>

            {/* Right Side Actions - ✨ AI Button, Theme Toggle & User Menu */}
            <div className='flex items-center gap-2 shrink-0'>
              {showAIButton && onAIButtonClick && (
                <button
                  onClick={onAIButtonClick}
                  className='relative p-2 rounded-lg bg-linear-to-br from-[#f4c24d] to-[#dba52b] text-[#171717] hover:from-[#ffd56f] hover:to-[#d39b1f] active:scale-95 transition-all duration-200 shadow-lg shadow-[#f4c24d]/20 group'
                  aria-label='AI 推荐'
                >
                  <Sparkles className='h-5 w-5 group-hover:scale-110 transition-transform duration-300' />
                </button>
              )}
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* More Menu Modal - Render outside nav to avoid z-index issues */}
      {showMoreMenu && (
        <div
          className='md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm'
          style={{ zIndex: 2147483647 }}
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className='absolute bottom-20 left-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800/30 overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className='flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                全部分类
              </h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className='p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors'
              >
                <X className='w-5 h-5 text-gray-600 dark:text-gray-400' />
              </button>
            </div>

            {/* All menu items in grid */}
            <div className='grid grid-cols-4 gap-4 p-4'>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <FastLink
                    key={item.label}
                    href={item.href}
                    useTransitionNav
                    onClick={() => setShowMoreMenu(false)}
                    className='flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 active:scale-95 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                  >
                    <div
                      className={`flex items-center justify-center w-12 h-12 rounded-2xl ${
                        active
                          ? 'bg-linear-to-br from-[#183a5b] to-[#365f8e]'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          active
                            ? 'text-white'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        active
                          ? 'text-[#102b47] dark:text-[#fff4d0]'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {item.label}
                    </span>
                  </FastLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation - Netflix Full-Width Style with Light Mode Support */}
      <nav
        className='md:hidden fixed left-0 right-0 z-40 bg-white/80 dark:bg-black/95 backdrop-blur-lg border-t border-black/5 dark:border-white/5 shadow-xl shadow-black/5 dark:shadow-2xl dark:shadow-black/40'
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className='flex items-center justify-around px-2 py-2'>
          {/* Show first 4 items + More button */}
          {menuItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <FastLink
                key={item.label}
                href={item.href}
                useTransitionNav
                className='flex flex-col items-center justify-center min-w-[60px] flex-1 py-2 px-1 transition-all duration-200 active:scale-95'
              >
                <Icon
                  className={`w-6 h-6 mb-1 transition-colors duration-200 ${
                    active
                      ? 'text-[#fff4d0]'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 ${
                    active
                      ? 'text-[#fff4d0]'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </FastLink>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className='flex flex-col items-center justify-center min-w-[60px] flex-1 py-2 px-1 transition-all duration-200 active:scale-95'
          >
            <MoreHorizontal className='w-6 h-6 mb-1 text-gray-600 dark:text-gray-400' />
            <span className='text-[10px] font-medium text-gray-600 dark:text-gray-400'>
              更多
            </span>
          </button>
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className='hidden md:block h-16' />
      <div className='md:hidden h-20' />
    </>
  );
}
