'use client';

import { Home, Search, Star, Clock, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTVNavigation } from '@/hooks/useTVNavigation';

interface TVNavBarProps {
  onFocusChange?: (index: number) => void;
}

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/search', label: '搜索', icon: Search },
  { href: '/favorites', label: '收藏', icon: Star },
  { href: '/history', label: '历史', icon: Clock },
  { href: '/settings', label: '设置', icon: Settings },
];

export default function TVNavBar({ onFocusChange }: TVNavBarProps) {
  const pathname = usePathname();

  const { focusIndex, containerRef, getFocusStyle } = useTVNavigation({
    columns: navItems.length,
    totalItems: navItems.length,
    onActivate: (index) => {
      // 导航由 Link 组件处理
    },
    loop: true,
  });

  return (
    <nav
      ref={containerRef}
      className="flex items-center gap-2 px-8 py-4 bg-gray-900/80 backdrop-blur-sm"
    >
      {navItems.map((item, index) => {
        const isActive = pathname === item.href;
        const isFocused = index === focusIndex;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-green-600 text-white'
                : isFocused
                ? 'bg-white/20 text-white scale-105'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            style={getFocusStyle(index)}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xl font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
