'use client';

import { Home, Search, Star, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/search', label: '搜索', icon: Search },
  { href: '/favorites', label: '收藏', icon: Star },
  { href: '/history', label: '历史', icon: Clock },
  { href: '/profile', label: '我的', icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 min-w-[48px] transition-colors ${
                isActive ? 'text-[#f4c24d]' : 'text-gray-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
