'use client';

import { Clock, Home, Search, Star, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PhoneLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/search', label: '搜索', icon: Search },
  { href: '/favorites', label: '收藏', icon: Star },
  { href: '/history', label: '历史', icon: Clock },
  { href: '/profile', label: '我的', icon: User },
];

export default function PhoneLayout({ children }: PhoneLayoutProps) {
  const pathname = usePathname();

  return (
    <div className='flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900'>
      {/* 主内容区域 */}
      <main className='flex-1 overflow-y-auto pb-16'>{children}</main>

      {/* 底部Tab导航 */}
      <nav
        className='fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950'
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className='flex items-center justify-around px-2 py-1'>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[48px] transition-colors ${
                  isActive
                    ? 'text-green-600 dark:text-green-500'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon className='h-5 w-5' />
                <span className='text-[11px] sm:text-xs font-medium'>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
