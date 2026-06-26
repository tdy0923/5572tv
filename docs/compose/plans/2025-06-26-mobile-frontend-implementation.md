# 5572 移动端独立前端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一套完全独立的移动端前端，提供原生APP级体验

**Architecture:** 共享Core层（业务逻辑）+ 设备特定UI层（组件、布局、交互）

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, TypeScript

## Global Constraints

- 移动端触摸目标: 最小44px
- 安全区域: `env(safe-area-inset-*)` 适配刘海屏
- 深色主题: #0a0a0a背景 + #f4c24d主色
- 动画: 300ms ease-out
- 最小宽度: 320px

---

## Phase 1: Core层抽取（当前会话执行）

### Task 1: 创建Core目录结构

**Files:**
- Create: `src/core/api/index.ts`
- Create: `src/core/hooks/index.ts`
- Create: `src/core/store/index.ts`
- Create: `src/core/utils/index.ts`

**Steps:**

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p src/core/api src/core/hooks src/core/store src/core/utils
```

- [ ] **Step 2: 创建Core API索引**

Create `src/core/api/index.ts`:
```ts
// Core API - 所有设备共享的API调用
export { ApiService } from '@/lib/api-service';
export type { ApiResponse, FavoriteItem } from '@/lib/types';
```

- [ ] **Step 3: 创建Core Hooks索引**

Create `src/core/hooks/index.ts`:
```ts
// Core Hooks - 所有设备共享的Hooks
export { useDanmu } from '@/hooks/useDanmu';
export { useFavoritesMutations } from '@/hooks/useFavoritesMutations';
```

- [ ] **Step 4: 创建Core Store索引**

Create `src/core/store/index.ts`:
```ts
// Core Store - 所有设备共享的状态管理
export { ClientCache } from '@/lib/client-cache';
```

- [ ] **Step 5: 创建Core Utils索引**

Create `src/core/utils/index.ts`:
```ts
// Core Utils - 所有设备共享的工具函数
export { processImageUrl, resolveCardPosterUrl } from '@/lib/utils';
export { generateStorageKey } from '@/lib/db.client';
```

- [ ] **Step 6: 验证**

Run: `npx tsc --noEmit`

- [ ] **Step 7: 提交**

```bash
git add src/core/
git commit -m "chore: 创建Core层目录结构"
```

---

### Task 2: 创建设备检测Hook

**Files:**
- Create: `src/core/hooks/useDevice.ts`

**Steps:**

- [ ] **Step 1: 创建useDevice Hook**

Create `src/core/hooks/useDevice.ts`:
```ts
'use client';

import { useMemo } from 'react';
import { detectPlatform } from '@/app/download/utils';

export type DeviceType = 'phone' | 'tablet' | 'tv' | 'desktop';

export function useDevice() {
  const device = useMemo(() => {
    const platform = detectPlatform();
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    
    let type: DeviceType = 'desktop';
    if (platform === 'android' || platform === 'ios') {
      type = width < 768 ? 'phone' : 'tablet';
    } else if (platform === 'tv') {
      type = 'tv';
    }
    
    return {
      type,
      isPhone: type === 'phone',
      isTablet: type === 'tablet',
      isTV: type === 'tv',
      isDesktop: type === 'desktop',
      isMobile: type === 'phone' || type === 'tablet',
      width,
    };
  }, []);

  return device;
}
```

- [ ] **Step 2: 验证**

Run: `npx tsc --noEmit`

- [ ] **Step 3: 提交**

```bash
git add src/core/hooks/useDevice.ts
git commit -m "feat: 创建设备检测Hook"
```

---

## Phase 2: Mobile UI组件（当前会话执行）

### Task 3: 创建Mobile布局系统

**Files:**
- Create: `src/ui/mobile/layouts/MobileLayout.tsx`
- Create: `src/ui/mobile/layouts/MobileNav.tsx`

**Steps:**

- [ ] **Step 1: 创建MobileLayout**

Create `src/ui/mobile/layouts/MobileLayout.tsx`:
```tsx
'use client';

import { ReactNode } from 'react';
import MobileNav from './MobileNav';

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function MobileLayout({ children, showNav = true }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="pb-20" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {children}
      </main>
      {showNav && <MobileNav />}
    </div>
  );
}
```

- [ ] **Step 2: 创建MobileNav**

Create `src/ui/mobile/layouts/MobileNav.tsx`:
```tsx
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
```

- [ ] **Step 3: 验证**

Run: `npx tsc --noEmit`

- [ ] **Step 4: 提交**

```bash
git add src/ui/mobile/layouts/
git commit -m "feat: 创建Mobile布局系统"
```

---

### Task 4: 创建Mobile核心组件

**Files:**
- Create: `src/ui/mobile/components/MobileVideoCard.tsx`
- Create: `src/ui/mobile/components/MobileHeroBanner.tsx`
- Create: `src/ui/mobile/components/MobileSearchBar.tsx`

**Steps:**

- [ ] **Step 1: 创建MobileVideoCard**

Create `src/ui/mobile/components/MobileVideoCard.tsx`:
```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { processImageUrl } from '@/lib/utils';

interface MobileVideoCardProps {
  title: string;
  poster: string;
  href: string;
  subtitle?: string;
  badge?: string;
  priority?: boolean;
}

export default function MobileVideoCard({
  title,
  poster,
  href,
  subtitle,
  badge,
  priority = false,
}: MobileVideoCardProps) {
  return (
    <Link href={href} className="block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-800">
        <Image
          src={processImageUrl(poster)}
          alt={title}
          fill
          sizes="50vw"
          className="object-cover"
          priority={priority}
        />
        
        {/* 播放按钮 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </div>

        {/* 徽章 */}
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium bg-[#f4c24d] text-black">
            {badge}
          </div>
        )}
      </div>
      
      <div className="mt-2 px-0.5">
        <h3 className="text-sm font-medium text-white line-clamp-1">{title}</h3>
        {subtitle && (
          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{subtitle}</p>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: 创建MobileHeroBanner**

Create `src/ui/mobile/components/MobileHeroBanner.tsx`:
```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { processImageUrl } from '@/lib/utils';

interface MobileHeroBannerProps {
  items: { poster: string; title: string; href: string }[];
  autoPlayInterval?: number;
}

export default function MobileHeroBanner({ 
  items, 
  autoPlayInterval = 5000 
}: MobileHeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [items.length, autoPlayInterval]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentIndex((prev) => (prev + 1) % items.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
      }
    }
  }, [touchStart, items.length]);

  if (items.length === 0) return null;

  return (
    <div 
      className="relative w-full h-[50vh] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={processImageUrl(item.poster)}
            alt={item.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      ))}
      
      {/* 指示器 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {items.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? 'bg-[#f4c24d] w-6' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建MobileSearchBar**

Create `src/ui/mobile/components/MobileSearchBar.tsx`:
```tsx
'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface MobileSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function MobileSearchBar({ 
  onSearch, 
  placeholder = '搜索影视内容' 
}: MobileSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 pl-10 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#f4c24d]/50"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      )}
    </form>
  );
}
```

- [ ] **Step 4: 验证**

Run: `npx tsc --noEmit`

- [ ] **Step 5: 提交**

```bash
git add src/ui/mobile/components/
git commit -m "feat: 创建Mobile核心组件"
```

---

### Task 5: 创建Mobile页面模板

**Files:**
- Create: `src/ui/mobile/pages/MobileHomePage.tsx`
- Create: `src/ui/mobile/pages/MobilePlayerPage.tsx`

**Steps:**

- [ ] **Step 1: 创建MobileHomePage**

Create `src/ui/mobile/pages/MobileHomePage.tsx`:
```tsx
'use client';

import MobileLayout from '../layouts/MobileLayout';
import MobileHeroBanner from '../components/MobileHeroBanner';
import MobileVideoCard from '../components/MobileVideoCard';

interface MobileHomePageProps {
  heroItems: { poster: string; title: string; href: string }[];
  sections: { title: string; items: { poster: string; title: string; href: string; subtitle?: string }[] }[];
}

export default function MobileHomePage({ heroItems, sections }: MobileHomePageProps) {
  return (
    <MobileLayout>
      {/* Hero Banner */}
      <MobileHeroBanner items={heroItems} />

      {/* 内容区块 */}
      {sections.map((section, sIndex) => (
        <section key={sIndex} className="py-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-lg font-bold text-white">{section.title}</h2>
            <button className="text-sm text-[#f4c24d]">更多</button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
            {section.items.map((item, iIndex) => (
              <div key={iIndex} className="flex-shrink-0 w-[45vw] snap-start">
                <MobileVideoCard
                  title={item.title}
                  poster={item.poster}
                  href={item.href}
                  subtitle={item.subtitle}
                  priority={sIndex === 0 && iIndex < 3}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </MobileLayout>
  );
}
```

- [ ] **Step 2: 创建MobilePlayerPage**

Create `src/ui/mobile/pages/MobilePlayerPage.tsx`:
```tsx
'use client';

import { useState } from 'react';
import MobileLayout from '../layouts/MobileLayout';

interface MobilePlayerPageProps {
  videoUrl: string;
  title: string;
  episodes: { index: number; title: string; url: string }[];
  currentEpisode: number;
  onEpisodeChange: (index: number) => void;
}

export default function MobilePlayerPage({
  videoUrl,
  title,
  episodes,
  currentEpisode,
  onEpisodeChange,
}: MobilePlayerPageProps) {
  const [showEpisodes, setShowEpisodes] = useState(false);

  return (
    <MobileLayout showNav={false}>
      {/* 视频播放器区域 */}
      <div className="relative w-full aspect-video bg-black">
        {/* 播放器将在这里渲染 */}
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          视频播放器
        </div>
      </div>

      {/* 视频信息 */}
      <div className="p-4">
        <h1 className="text-xl font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-gray-400">
          第 {currentEpisode + 1} 集 / 共 {episodes.length} 集
        </p>
      </div>

      {/* 选集按钮 */}
      <div className="px-4">
        <button
          onClick={() => setShowEpisodes(!showEpisodes)}
          className="w-full py-3 bg-white/5 rounded-xl text-white font-medium"
        >
          选集 ({episodes.length}集)
        </button>
      </div>

      {/* 选集面板 */}
      {showEpisodes && (
        <div className="p-4">
          <div className="grid grid-cols-6 gap-2">
            {episodes.map((ep, index) => (
              <button
                key={index}
                onClick={() => onEpisodeChange(index)}
                className={`py-2 rounded-lg text-sm font-medium ${
                  index === currentEpisode
                    ? 'bg-[#f4c24d] text-black'
                    : 'bg-white/10 text-white'
                }`}
              >
                {ep.index || index + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
```

- [ ] **Step 3: 验证**

Run: `npx tsc --noEmit`

- [ ] **Step 4: 提交**

```bash
git add src/ui/mobile/pages/
git commit -m "feat: 创建Mobile页面模板"
```

---

## Phase 3: 集成（后续会话执行）

### Task 6: 更新路由加载逻辑

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

**Steps:**

- [ ] **Step 1: 更新根布局**

修改 `src/app/layout.tsx` 添加设备检测：

```tsx
import { DeviceProvider } from '@/core/hooks/useDevice';

// 在body标签内添加DeviceProvider
<body>
  <DeviceProvider>
    {children}
  </DeviceProvider>
</body>
```

- [ ] **Step 2: 更新首页**

修改 `src/app/page.tsx` 根据设备加载不同UI：

```tsx
'use client';

import { useDevice } from '@/core/hooks/useDevice';
import MobileHomePage from '@/ui/mobile/pages/MobileHomePage';

export default function HomePage() {
  const { isMobile } = useDevice();
  
  // 移动端使用独立UI
  if (isMobile) {
    return <MobileHomePage heroItems={[]} sections={[]} />;
  }
  
  // 桌面端使用原有UI
  return <DesktopHomePage />;
}
```

- [ ] **Step 3: 验证**

Run: `npx tsc --noEmit`

- [ ] **Step 4: 提交**

```bash
git add src/app/
git commit -m "feat: 集成Mobile UI到路由系统"
```

---

## Phase 4: 测试验证（后续会话执行）

### Task 7: 完整测试

**Steps:**

- [ ] **Step 1: 类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 2: 构建测试**

Run: `npm run build`

- [ ] **Step 3: 移动端测试**

在手机浏览器访问：
- 首页: 检查MobileHeroBanner、MobileVideoCard
- 搜索页: 检查MobileSearchBar
- 底部导航: 检查MobileNav

- [ ] **Step 4: 桌面端测试**

在桌面浏览器访问：
- 首页: 确保桌面端UI不受影响
- 播放页: 确保桌面端播放正常

- [ ] **Step 5: 提交并推送**

```bash
git add -A
git commit -m "feat: 移动端独立前端完成"
git push origin main
```
