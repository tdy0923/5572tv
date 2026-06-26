# 5572 PWA 重新设计实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将5572的下载页和PWA体验重新设计为专业的流媒体风格，提供安装引导和APP级体验。

**Architecture:** 流媒体风格深色UI + 智能平台检测 + 步骤式安装引导 + 底部Tab导航

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, Lucide Icons

## Global Constraints

- 品牌色: `#f4c24d`（金黄）+ `#0a0a0a`（深黑背景）
- 触摸目标: 最小44px
- 圆角: 16px-24px
- 动画: 300ms ease-out
- 支持: Android 5.0+, iOS 14.0+, Android TV

---

## File Structure

```
src/app/download/
├── page.tsx                    # 下载页主组件
├── components/
│   ├── HeroSection.tsx         # Hero区域
│   ├── PlatformTabs.tsx        # 平台切换标签
│   ├── InstallGuide.tsx        # 安装引导弹窗
│   └── FeatureGrid.tsx         # 功能亮点网格

src/components/layout/
├── MobileLayout.tsx            # 移动端布局（底部Tab）
└── MobileNav.tsx               # 底部导航栏

public/
├── manifest.json               # PWA配置（已存在）
└── icons/                      # PWA图标（已存在）
```

---

## Task 1: 重构下载页主组件

**Covers:** 下载页整体架构

**Files:**
- Modify: `src/app/download/page.tsx`

**Steps:**

- [ ] **Step 1: 创建新的下载页骨架**

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { detectPlatform } from './utils';
import HeroSection from './components/HeroSection';
import PlatformTabs from './components/PlatformTabs';
import InstallGuide from './components/InstallGuide';
import FeatureGrid from './components/FeatureGrid';
import DynamicBackground from '@/components/download/DynamicBackground';

export default function DownloadPage() {
  const platform = useMemo(() => detectPlatform(), []);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(platform);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <DynamicBackground />
      <HeroSection 
        platform={selectedPlatform} 
        onShowGuide={() => setShowGuide(true)} 
      />
      <PlatformTabs 
        selected={selectedPlatform} 
        onSelect={setSelectedPlatform} 
      />
      <FeatureGrid />
      {showGuide && (
        <InstallGuide 
          platform={selectedPlatform} 
          onClose={() => setShowGuide(false)} 
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建工具函数**

Create `src/app/download/utils.ts`:
```ts
export function detectPlatform(): 'android' | 'ios' | 'tv' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/smart tv|android tv|roku|fire tv/i.test(ua)) return 'tv';
  return 'desktop';
}
```

- [ ] **Step 3: 验证构建**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/app/download/
git commit -m "refactor: 下载页骨架重构"
```

---

## Task 2: 创建Hero区域组件

**Covers:** Hero区域设计

**Files:**
- Create: `src/app/download/components/HeroSection.tsx`

**Steps:**

- [ ] **Step 1: 创建HeroSection组件**

```tsx
'use client';

import { Download, Smartphone, Tv } from 'lucide-react';

interface HeroSectionProps {
  platform: 'android' | 'ios' | 'tv' | 'desktop';
  onShowGuide: () => void;
}

export default function HeroSection({ platform, onShowGuide }: HeroSectionProps) {
  const isIOS = platform === 'ios';

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]" />
      
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-[#f4c24d] to-[#d89c18] flex items-center justify-center shadow-2xl shadow-[#f4c24d]/30">
          <span className="text-4xl font-black text-black">5</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-6xl font-black mb-3 tracking-tight">
          5572 影视
        </h1>
        <p className="text-gray-400 text-lg mb-10">智能影视播放平台</p>

        {/* CTA Button */}
        {isIOS ? (
          <div className="space-y-4">
            <button
              onClick={onShowGuide}
              className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#f4c24d]/30 min-h-[56px]"
            >
              添加到主屏幕
            </button>
            <p className="text-sm text-gray-500">Safari 打开后添加到主屏幕使用</p>
          </div>
        ) : (
          <div className="space-y-4">
            <a
              href="/download/5572tv-android.apk"
              className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#f4c24d] to-[#d89c18] text-black rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-[#f4c24d]/30 min-h-[56px]"
            >
              <Download className="w-5 h-5" />
              下载 APK
            </a>
            <p className="text-sm text-gray-500">v1.5.0 · 65MB · Android 5.0+</p>
            <button
              onClick={onShowGuide}
              className="text-sm text-[#f4c24d] hover:underline"
            >
              安装遇到问题？点击查看帮助 →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 验证构建**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/app/download/components/HeroSection.tsx
git commit -m "feat: 添加Hero区域组件"
```

---

## Task 3: 创建平台切换标签组件

**Covers:** 平台切换设计

**Files:**
- Create: `src/app/download/components/PlatformTabs.tsx`

**Steps:**

- [ ] **Step 1: 创建PlatformTabs组件**

```tsx
'use client';

import { Smartphone, Tv } from 'lucide-react';

interface PlatformTabsProps {
  selected: string;
  onSelect: (platform: 'android' | 'ios' | 'tv') => void;
}

const platforms = [
  { id: 'android', name: 'Android', icon: Smartphone },
  { id: 'ios', name: 'iOS', icon: Smartphone },
  { id: 'tv', name: 'TV', icon: Tv },
];

export default function PlatformTabs({ selected, onSelect }: PlatformTabsProps) {
  return (
    <div className="flex justify-center gap-2 px-4 py-6">
      {platforms.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id as 'android' | 'ios' | 'tv')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            selected === p.id
              ? 'bg-[#f4c24d] text-black'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <p.icon className="w-4 h-4" />
          {p.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 验证构建**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/app/download/components/PlatformTabs.tsx
git commit -m "feat: 添加平台切换标签组件"
```

---

## Task 4: 创建安装引导组件

**Covers:** 安装引导设计

**Files:**
- Create: `src/app/download/components/InstallGuide.tsx`

**Steps:**

- [ ] **Step 1: 创建InstallGuide组件**

```tsx
'use client';

import { Smartphone, Tv } from 'lucide-react';

interface InstallGuideProps {
  platform: 'android' | 'ios' | 'tv' | 'desktop';
  onClose: () => void;
}

function AndroidSteps() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-[#f4c24d]" />
        Android 安装步骤
      </h3>
      <div className="space-y-3">
        {[
          { step: 1, text: '点击下方按钮下载 APK' },
          { step: 2, text: '打开下载的文件' },
          { step: 3, text: '点击「仍然安装」或「允许本次安装」' },
          { step: 4, text: '安装完成，打开即可使用' },
        ].map((s) => (
          <div key={s.step} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#f4c24d]/20 text-[#f4c24d] flex items-center justify-center text-xs font-bold flex-shrink-0">
              {s.step}
            </div>
            <p className="text-sm text-gray-300">{s.text}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        * 首次安装可能提示「风险应用」，这是系统安全机制，不影响使用
      </p>
    </div>
  );
}

function IOSSteps() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-[#f4c24d]" />
        添加到主屏幕
      </h3>
      <div className="space-y-3">
        {[
          { step: 1, text: '用 Safari 打开此页面', icon: '🌐' },
          { step: 2, text: '点击底部「分享」按钮', icon: '📤' },
          { step: 3, text: '向下滑动，点击「添加到主屏幕」', icon: '➕' },
          { step: 4, text: '点击右上角「添加」完成', icon: '✅' },
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#f4c24d]/20 flex items-center justify-center text-lg flex-shrink-0">
              {s.icon}
            </div>
            <p className="text-sm text-gray-300">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-xl bg-[#f4c24d]/10 border border-[#f4c24d]/20">
        <p className="text-sm text-[#f4c24d]">
          💡 添加后可在主屏幕直接打开，体验与原生 App 一致
        </p>
      </div>
    </div>
  );
}

function TVSteps() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Tv className="w-5 h-5 text-[#f4c24d]" />
        电视安装
      </h3>
      <div className="space-y-3">
        {[
          { step: 1, text: 'U盘拷贝 APK 文件' },
          { step: 2, text: '电视上打开文件管理器' },
          { step: 3, text: '找到 APK 文件并安装' },
          { step: 4, text: '允许「安装未知来源应用」' },
        ].map((s) => (
          <div key={s.step} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#f4c24d]/20 text-[#f4c24d] flex items-center justify-center text-xs font-bold flex-shrink-0">
              {s.step}
            </div>
            <p className="text-sm text-gray-300">{s.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InstallGuide({ platform, onClose }: InstallGuideProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-3xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">安装指南</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {platform === 'ios' ? <IOSSteps /> : 
         platform === 'tv' ? <TVSteps /> : 
         <AndroidSteps />}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-[#f4c24d] text-black rounded-xl font-bold"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证构建**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/app/download/components/InstallGuide.tsx
git commit -m "feat: 添加安装引导组件"
```

---

## Task 5: 创建功能亮点网格组件

**Covers:** 功能展示设计

**Files:**
- Create: `src/app/download/components/FeatureGrid.tsx`

**Steps:**

- [ ] **Step 1: 创建FeatureGrid组件**

```tsx
'use client';

const features = [
  { icon: '⚡', title: '极速播放', desc: '多源聚合，秒开无广告' },
  { icon: '📥', title: '离线缓存', desc: 'WiFi下载，离线观看' },
  { icon: '🔄', title: '多端同步', desc: '进度漫游' },
  { icon: '🤖', title: 'AI 推荐', desc: '智能推荐' },
];

export default function FeatureGrid() {
  return (
    <section className="py-16 px-4 border-t border-white/5">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-2xl">{f.icon}</span>
            <h3 className="font-semibold mt-3 mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 验证构建**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/app/download/components/FeatureGrid.tsx
git commit -m "feat: 添加功能亮点网格组件"
```

---

## Task 6: 验证并部署

**Covers:** 构建验证和部署

**Files:**
- 无新增文件

**Steps:**

- [ ] **Step 1: 完整构建验证**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 2: 本地测试**

访问 http://localhost:3000/download
- 检查Android/iOS/TV标签切换
- 检查安装引导弹窗
- 检查触摸目标（44px+）
- 检查深色主题

- [ ] **Step 3: 提交并推送**

```bash
git add -A
git commit -m "feat: PWA下载页重新设计 - 流媒体风格"
git push origin main
```

- [ ] **Step 4: 验证生产环境**

等待CI/CD完成后访问 https://www.5572.net/download 验证
