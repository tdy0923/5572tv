# UI/UX 全面修复计划

> **Goal:** 修复审计报告中全部 23 个 UI/UX 问题，覆盖播放页、下载页、管理后台、通用组件
> **Architecture:** 针对性修复各组件的响应式问题，遵循 mobile-first 原则
> **Tech Stack:** Next.js, Tailwind CSS, React

## Global Constraints

- 所有触控目标 ≥ 44px (mobile)
- 不使用固定宽度，使用 `w-full sm:w-*` 响应式
- 最小支持 320px 视口
- Safe area 处理: `env(safe-area-inset-bottom)`
- 遵循 5572-dev-workflow skill: read-before-edit, type check, build verify
- ESLint pre-commit hook 必须通过

---

## Task 1: 播放页 - 修复小屏手机播放器溢出

**Covers:** Audit #1, #2
**Files:**

- Modify: `src/app/play/page.tsx:4620-4800`

**Interfaces:**

- Consumes: 当前播放器高度类名 `h-[50vh] min-h-[280px] sm:h-[360px] md:h-[420px] lg:h-full`
- Produces: 响应式播放器高度，小屏手机自适应

**Steps:**

1. **修改播放器容器高度** - 将固定 `min-h-[280px]` 改为响应式
   - 文件: `src/app/play/page.tsx:4622`
   - 当前: `className='relative w-full h-[50vh] min-h-[280px] sm:h-[360px] md:h-[420px] lg:h-full'`
   - 改为: `className='relative w-full h-[40vh] sm:h-[45vh] md:h-[50vh] lg:h-[480px] xl:h-[560px] min-h-[200px] sm:min-h-[240px]'`
   - 同时添加 `max-h-[calc(100vh-300px)]` 防止在小屏手机上占据过多空间

2. **修复选集面板布局** - 移动端改为垂直堆叠而非网格
   - 文件: `src/app/play/page.tsx:4610-4620`
   - 当前: `md:grid-cols-4` 在移动端给播放器 75% 宽度
   - 改为: 移动端播放器全宽 `w-full`，选集面板在下方全宽展示
   - 将 `grid-cols-1 md:grid-cols-4` 改为 `grid-cols-1 lg:grid-cols-4`

3. **修复上一集/下一集按钮触控高度**
   - 文件: `src/app/play/page.tsx:4770-4786`
   - 当前: `py-3` 总高度约 36-40px
   - 改为: `py-3.5 sm:py-4 min-h-[44px]`

4. **修复选集面板标题空间竞争**
   - 文件: `src/components/EpisodeSelector.tsx:613`
   - 当前: `h-5 sm:h-6` 太窄
   - 改为: `h-6 sm:h-7` 让标题和分辨率徽章有足够空间
   - 添加 `overflow-x-auto` 和 `whitespace-normal break-words` 到标题容器

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 2: 下载页 - 修复 QR 码过大和布局问题

**Covers:** Audit #3, #17, #22
**Files:**

- Modify: `src/app/download/page.tsx`

**Steps:**

1. **缩小 QR 码尺寸** - 从 140px 改为响应式
   - 文件: `src/app/download/page.tsx:31-36`
   - 当前: `w-[140px] h-[140px]`
   - 改为: `w-[100px] h-[100px] sm:w-[120px] sm:h-[120px]`

2. **修复 Hero 区域 `min-h-screen` 跳动**
   - 文件: `src/app/download/page.tsx:90`
   - 当前: `min-h-screen`
   - 改为: `min-h-[100dvh]` (动态视口高度)

3. **修复功能网格平板端列数**
   - 文件: `src/app/download/page.tsx:234`
   - 当前: `grid-cols-2 lg:grid-cols-4`
   - 改为: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 3: 管理后台 - 修复侧边栏小屏适配

**Covers:** Audit #4
**Files:**

- Modify: `src/app/admin/_content.tsx:421`

**Steps:**

1. **修复侧边栏 grid 断点**
   - 当前: `lg:grid-cols-[280px_minmax(0,1fr)]` 在 < 1024px 时布局混乱
   - 改为: `grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]`
   - 移除 `sticky` 或在 `md:` 断点改为非 sticky
   - 添加: `lg:sticky lg:top-24` (仅在大屏 sticky)

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 4: SkipController - 修复移动端触控和布局

**Covers:** Audit #5, #6
**Files:**

- Modify: `src/components/SkipController.tsx`

**Steps:**

1. **修复删除按钮触控目标** - 将 `px-1.5 py-0.5` 改为至少 44px
   - 文件: `src/components/SkipController.tsx:1600`
   - 当前: `px-1.5 py-0.5` (约 24x12px)
   - 改为: `px-3 py-2 min-w-[44px] min-h-[44px]`

2. **修复设置按钮标签隐藏** - 移动端也显示文字
   - 文件: `src/components/SkipController.tsx:1677`
   - 当前: `hidden sm:inline`
   - 改为: `inline` (始终显示) 或使用 `text-xs` 缩小字体

3. **限制面板最大宽度** - 防止拖出屏幕
   - 文件: `src/components/SkipController.tsx:1543`
   - 当前: `max-w-sm` (384px)
   - 改为: `max-w-[calc(100vw-2rem)] sm:max-w-sm`

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 5: VideoCard - 修复徽章拥挤和小屏适配

**Covers:** Audit #8, #15
**Files:**

- Modify: `src/components/VideoCard.tsx`

**Steps:**

1. **修复移动端 AI 按钮可见性**
   - 文件: `src/components/VideoCard.tsx:1580-1581`
   - 当前: `hidden md:block` 移动端完全隐藏
   - 改为: `block md:hidden` (仅移动端显示) 或使用 `MobileActionSheet`
   - 或者: `hidden md:block` 保留但改为 `sm:block md:hidden lg:block` 让平板也可见

2. **修复小卡片徽章重叠**
   - 文件: `src/components/VideoCard.tsx:1446-1465, 1530-1573`
   - 评分徽章 `top-2 right-2` 和来源徽章 `bottom-2 right-2` 在小卡片上可能重叠
   - 添加 `@[140px]:top-1 @[140px]:right-1` 和 `@[140px]:bottom-1` 缩小间距
   - 确保 `z-10` 层级正确

3. **添加 `overflow-hidden` 到卡片容器** 防止徽章溢出

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 6: 下载弹窗 - 修复关闭按钮触控区域

**Covers:** Audit #9
**Files:**

- Modify: `src/components/download/DownloadPanel.tsx:139-156`

**Steps:**

1. **扩大关闭按钮触控区域**
   - 当前: `w-5 h-5` SVG 图标无额外 padding
   - 改为: `p-2` 包裹 SVG，SVG 保持 `w-5 h-5`
   - 添加: `rounded-full active:bg-gray-100` 提供视觉反馈

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 7: 搜索页 - 修复海报尺寸和标签溢出

**Covers:** Audit #11, #12
**Files:**

- Modify: `src/app/search/_content.tsx`

**Steps:**

1. **增大搜索列表海报**
   - 文件: `src/app/search/_content.tsx:163`
   - 当前: `h-28 w-20` (112x80px)
   - 改为: `h-32 w-24 sm:h-36 sm:w-28`

2. **验证胶囊切换标签已有 `overflow-x-auto`**
   - `CapsuleSwitch.tsx:63` 已有 `overflow-x-auto scrollbar-hide`
   - 确认无需额外修复

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 8: 全局 - 修复滚动条隐藏和布局一致性

**Covers:** Audit #18, #20, #21
**Files:**

- Modify: `src/app/globals.css`, `src/components/PageLayout.tsx`

**Steps:**

1. **滚动条隐藏添加注释** - 不是 bug 但加注释说明意图
   - 文件: `src/app/globals.css:346-354`
   - 添加 `/* Scrollbar hidden for cleaner UI - except ArtPlayer */` 注释

2. **统一 PageLayout 间距**
   - 文件: `src/components/PageLayout.tsx`
   - 检查现代导航 `pt-[44px]` 和传统导航 `mt-14` 的差异
   - 统一使用 `pt-[44px] md:pt-16` 作为基准

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 9: VirtualGrid - 修复列检测竞态条件

**Covers:** Audit #20
**Files:**

- Modify: `src/components/VirtualGrid.tsx:46-61`

**Steps:**

1. **添加防抖到 detectColumns**
   - 当前: `ResizeObserver` 立即触发
   - 改为: 使用 `requestAnimationFrame` 或 100ms debounce
   - 添加: `let rafId: number` 存储 rAF ID，在 `detectColumns` 前取消上一个

2. **添加初始延迟**
   - 在 `useEffect` 中添加 `setTimeout(100)` 确保 DOM 已渲染

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 10: 移动端底部导航 - 优化文字大小

**Covers:** Audit #13
**Files:**

- Modify: `src/components/layout/PhoneLayout.tsx:42-52`

**Steps:**

1. **增大导航文字**
   - 当前: `text-[10px]`
   - 改为: `text-[11px] sm:text-xs` (11px 比 10px 更易读，sm 断点恢复 xs)

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 11: 移动端头部 - 修复 Logo 重叠

**Covers:** Audit #14
**Files:**

- Modify: `src/components/PageLayout.tsx:57-77`

**Steps:**

1. **限制 Logo 最大宽度**
   - 文件: `src/components/PageLayout.tsx:63`
   - 当前: Logo 绝对居中，可能与左右按钮重叠
   - 改为: 添加 `max-w-[50%] truncate` 到 Logo 文本
   - 或者: 使用 `flex-1 text-center` 替代绝对定位

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 12: 选集面板 - 触摸设备 tooltip 替代方案

**Covers:** Audit #7
**Files:**

- Modify: `src/components/EpisodeSelector.tsx:613-624`

**Steps:**

1. **将 hover tooltip 改为长按/点击 tooltip**
   - 文件: `src/components/EpisodeSelector.tsx:619-624`
   - 当前: `group-hover/title:opacity-100` 在触摸设备上不触发
   - 改为: 添加 `onLongPress` 或点击状态来显示完整标题
   - 简化方案: 添加 `title` 属性到 `<h3>` 元素，浏览器原生 tooltip

**Verification:** `npx tsc --noEmit && npm run build`

---

## Task 13: 构建验证和类型检查

**Covers:** All tasks
**Files:**

- Run verification commands

**Steps:**

1. **运行类型检查**

   ```bash
   cd /root/www.5572.net && npx tsc --noEmit
   ```

2. **运行构建**

   ```bash
   cd /root/www.5572.net && npm run build
   ```

3. **验证无错误后提交**

**Verification:** 类型检查和构建均通过
