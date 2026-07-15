'use client';

import {
  Cat,
  Clover,
  Film,
  Globe,
  Home,
  PlaySquare,
  Radio,
  Star,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BASE_NAV_ITEMS,
  getDynamicNavItems,
  isActive as matchNavItem,
} from '../lib/navigation';

// 简单的 className 合并函数
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

/**
 * 移动端底部导航栏 - 克制的深蓝影院风格
 * 与顶部导航保持统一的品牌色语言
 */
const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // 当前激活路径：优先使用传入的 activePath，否则回退到浏览器地址
  const currentActive = activePath ?? pathname;

  const [runtimeConfig, setRuntimeConfig] = useState<any>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRuntimeConfig((window as any).RUNTIME_CONFIG);
  }, []);

  const iconMap: Record<string, any> = {
    Home,
    Globe,
    Film,
    Tv,
    PlaySquare,
    Cat,
    Clover,
    Radio,
    Star,
  };

  const navItems = useMemo(() => {
    const baseItems = BASE_NAV_ITEMS.filter(
      (item) => !['/search', '/download'].includes(item.href),
    ).map((item) => ({
      ...item,
      label: item.label === '源浏览器' ? '源浏览' : item.label,
    }));
    return [...baseItems, ...getDynamicNavItems(runtimeConfig)];
  }, [runtimeConfig]);

  // 判断是否激活
  const isActive = useCallback(
    (href: string) => matchNavItem(href, currentActive),
    [currentActive],
  );

  // 滚动到激活项
  const scrollToActiveItem = useCallback(() => {
    const activeIndex = navItems.findIndex((item) => isActive(item.href));
    if (activeIndex === -1) return;

    const activeItem = itemRefs.current[activeIndex];
    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [navItems, isActive]);

  // 路径变化时滚动到激活项
  useEffect(() => {
    const timer = setTimeout(scrollToActiveItem, 100);
    return () => clearTimeout(timer);
  }, [currentActive, scrollToActiveItem]);

  return (
    <nav
      role='navigation'
      aria-label='主导航'
      className={cn(
        'md:hidden fixed left-0 right-0 z-30',
        'bg-white dark:bg-[#0b0b0b]/96',
        'backdrop-blur-lg',
        'border-t border-gray-200 dark:border-gray-700 shadow-md',
      )}
      style={{
        // 贴底，使用 safe area insets
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* 横向滚动容器 */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'flex items-center justify-around px-2 py-2.5',
          'overflow-x-auto',
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* 隐藏 Webkit 滚动条 */}
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {navItems.map((item, index) => {
          const active = isActive(item.href);
          const Icon = iconMap[item.iconName];

          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={cn(
                'flex flex-col items-center justify-center',
                'min-w-[48px] flex-1',
                'rounded-2xl py-2 px-1',
                'transition-all duration-200',
                'active:scale-95',
                active && 'bg-white dark:bg-gray-800',
              )}
            >
              <Icon
                className={cn(
                  'mb-1 h-6 w-6',
                  'transition-colors duration-200',
                  active ? 'text-[#fff6de]' : 'text-white/60',
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  'transition-colors duration-200',
                  active ? 'text-[#fff6de]' : 'text-white/60',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
