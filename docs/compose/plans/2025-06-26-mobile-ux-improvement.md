# 5572 整站移动端UX改善实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全面改善5572网站的移动端用户体验，修复20个关键UX问题，提升交互质量

**Architecture:** 按优先级分批修复：HIGH问题优先（5个），然后MEDIUM（9个），最后LOW（6个）

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, Lucide Icons

## Global Constraints

- 触摸目标: 最小44px
- 安全区域: `env(safe-area-inset-*)` 适配刘海屏
- 文字: 最小14px
- 响应式断点: sm(640px), md(768px), lg(1024px)
- 320px最小宽度兼容

---

## Phase 1: HIGH优先级问题（5个）

### Task 1: 修复GlobalErrorIndicator溢出

**Files:**
- Modify: `src/components/GlobalErrorIndicator.tsx:105`

**问题:** `min-w-[300px]` 在320px屏幕溢出

- [ ] **Step 1: 修改宽度约束**

将 `min-w-[300px] max-w-[400px]` 改为 `max-w-[calc(100vw-2rem)]`

- [ ] **Step 2: 验证**

在320px视口测试，错误提示不应溢出

- [ ] **Step 3: 提交**

```bash
git add src/components/GlobalErrorIndicator.tsx
git commit -m "fix: GlobalErrorIndicator 响应式宽度修复"
```

---

### Task 2: 修复PhoneLayout底部导航安全区域

**Files:**
- Modify: `src/components/layout/PhoneLayout.tsx:31-54`

**问题:** 底部导航缺少 `safe-area-inset-bottom`

- [ ] **Step 1: 添加安全区域padding**

在底部导航容器添加 `pb-[env(safe-area-inset-bottom)]`

- [ ] **Step 2: 验证**

在iPhone X+设备测试，底部Tab不应被Home条遮挡

- [ ] **Step 3: 提交**

```bash
git add src/components/layout/PhoneLayout.tsx
git commit -m "fix: PhoneLayout 添加底部安全区域"
```

---

### Task 3: 修复弹幕输入框安全区域冲突

**Files:**
- Modify: `src/app/play/page.tsx:4139`

**问题:** `bottom:80px` 硬编码，与键盘/安全区域冲突

- [ ] **Step 1: 改用动态计算**

将 `bottom:80px` 改为使用 `env(safe-area-inset-bottom)` + 动态键盘高度

- [ ] **Step 2: 验证**

在iPhone X+测试弹幕输入框位置

- [ ] **Step 3: 提交**

```bash
git add src/app/play/page.tsx
git commit -m "fix: 弹幕输入框安全区域修复"
```

---

### Task 4: 修复搜索页筛选按钮溢出

**Files:**
- Modify: `src/app/search/_content.tsx:1347,1368,1394`

**问题:** `min-w-[110px]` 在320px屏幕溢出

- [ ] **Step 1: 改为响应式宽度**

将 `min-w-[110px]` 改为 `min-w-0 flex-shrink`，允许按钮自适应

- [ ] **Step 2: 验证**

在320px视口测试筛选按钮

- [ ] **Step 3: 提交**

```bash
git add src/app/search/_content.tsx
git commit -m "fix: 搜索页筛选按钮响应式修复"
```

---

### Task 5: 修复播放器播放按钮在移动端不可见

**Files:**
- Modify: `src/components/VideoCard.tsx:1115`

**问题:** `opacity-0 group-hover:opacity-100` 在触摸设备上永远不显示

- [ ] **Step 1: 添加移动端可见性**

添加 `md:opacity-0 md:group-hover:opacity-100` 使移动端始终显示播放按钮

- [ ] **Step 2: 验证**

在手机上测试，播放按钮应始终可见

- [ ] **Step 3: 提交**

```bash
git add src/components/VideoCard.tsx
git commit -m "fix: VideoCard 播放按钮移动端可见"
```

---

## Phase 2: MEDIUM优先级问题（9个）

### Task 6: 修复CapsuleSwitch标签溢出

**Files:**
- Modify: `src/components/CapsuleSwitch.tsx:90`

**问题:** `min-w-[72px]` 导致4个标签在320px溢出

- [ ] **Step 1: 改为可滚动标签**

将固定宽度改为 `min-w-[60px]` 并确保容器 `overflow-x-auto`

- [ ] **Step 2: 验证**

在320px视口测试标签切换

- [ ] **Step 3: 提交**

```bash
git add src/components/CapsuleSwitch.tsx
git commit -m "fix: CapsuleSwitch 标签响应式"
```

---

### Task 7: 修复HeroBanner指示器触摸目标过小

**Files:**
- Modify: `src/components/HeroBanner.tsx:462-471`

**问题:** 指示器圆点只有8px，无法可靠点击

- [ ] **Step 1: 增大触摸区域**

将指示器容器改为 `min-w-[44px] min-h-[44px]`，内部圆点保持视觉大小

- [ ] **Step 2: 验证**

在手机上测试轮播指示器点击

- [ ] **Step 3: 提交**

```bash
git add src/components/HeroBanner.tsx
git commit -m "fix: HeroBanner 指示器触摸目标修复"
```

---

### Task 8: 修复EpisodeSelector分类标签溢出

**Files:**
- Modify: `src/components/EpisodeSelector.tsx:412`

**问题:** `min-w-[64px]` 在小屏幕导致滚动摩擦

- [ ] **Step 1: 优化标签宽度**

将 `min-w-[64px] sm:min-w-[80px]` 改为 `min-w-[56px] sm:min-w-[72px]`

- [ ] **Step 2: 验证**

在320px视口测试分类标签滚动

- [ ] **Step 3: 提交**

```bash
git add src/components/EpisodeSelector.tsx
git commit -m "fix: EpisodeSelector 标签宽度优化"
```

---

### Task 9: 修复首页网格间距过大

**Files:**
- Modify: `src/app/page.tsx:1002`

**问题:** `gap-y-10` 在移动端浪费空间

- [ ] **Step 1: 减小移动端间距**

将 `gap-y-10` 改为 `gap-y-6 sm:gap-y-10`

- [ ] **Step 2: 验证**

在320px视口测试网格间距

- [ ] **Step 3: 提交**

```bash
git add src/app/page.tsx
git commit -m "fix: 首页网格间距响应式"
```

---

### Task 10: 修复ContinueWatching卡片标题裁剪

**Files:**
- Modify: `src/components/ContinueWatching.tsx:197,217`

**问题:** `min-w-[96px]` 导致标题在窄卡片上不可读

- [ ] **Step 1: 调整卡片宽度**

将 `min-w-[96px] w-24` 改为 `min-w-[100px] w-[100px]`

- [ ] **Step 2: 验证**

在320px视口测试继续观看卡片

- [ ] **Step 3: 提交**

```bash
git add src/components/ContinueWatching.tsx
git commit -m "fix: ContinueWatching 卡片宽度优化"
```

---

### Task 11: 修复MobileActionSheet关闭按钮过小

**Files:**
- Modify: `src/components/MobileActionSheet.tsx:262-268`

**问题:** `p-2` 导致32px触摸目标

- [ ] **Step 1: 增大关闭按钮**

将 `p-2` 改为 `p-3` 确保44px触摸目标

- [ ] **Step 2: 验证**

在手机上测试操作面板关闭

- [ ] **Step 3: 提交**

```bash
git add src/components/MobileActionSheet.tsx
git commit -m "fix: MobileActionSheet 关闭按钮触摸目标"
```

---

### Task 12: 修复弹幕设置面板图标过小

**Files:**
- Modify: `src/components/play/DanmuSettingsPanel.tsx:952,975`

**问题:** 16px图标触摸目标不足

- [ ] **Step 1: 增大图标和触摸区域**

将图标从16px改为20px，添加 `p-2` padding

- [ ] **Step 2: 验证**

在手机上测试弹幕设置面板

- [ ] **Step 3: 提交**

```bash
git add src/components/play/DanmuSettingsPanel.tsx
git commit -m "fix: 弹幕设置面板图标触摸目标"
```

---

### Task 13: 修复ModernNav关闭按钮过小

**Files:**
- Modify: `src/components/ModernNav.tsx:284-289`

**问题:** `p-2` 导致32px触摸目标

- [ ] **Step 1: 增大关闭按钮**

将 `p-2` 改为 `p-3`

- [ ] **Step 2: 验证**

在手机上测试More菜单关闭

- [ ] **Step 3: 提交**

```bash
git add src/components/ModernNav.tsx
git commit -m "fix: ModernNav 关闭按钮触摸目标"
```

---

### Task 14: 修复HeroBanner无移动端滑动提示

**Files:**
- Modify: `src/components/HeroBanner.tsx:214-219,442`

**问题:** 移动端无滑动提示，箭头导航被隐藏

- [ ] **Step 1: 添加滑动提示**

在移动端显示"← 滑动浏览 →"提示文字

- [ ] **Step 2: 验证**

在手机上查看轮播是否有滑动提示

- [ ] **Step 3: 提交**

```bash
git add src/components/HeroBanner.tsx
git commit -m "fix: HeroBanner 添加移动端滑动提示"
```

---

### Task 15: 修复首页网格间距过大（提醒/收藏）

**Files:**
- Modify: `src/app/page.tsx:1002`

**问题:** `gap-y-10` 在移动端浪费空间（与Task 9相同区域）

- [ ] **Step 1: 统一优化间距**

确保所有网格使用 `gap-y-6 sm:gap-y-10`

- [ ] **Step 2: 验证**

在320px视口测试所有网格

- [ ] **Step 3: 提交**

```bash
git add src/app/page.tsx
git commit -m "fix: 首页所有网格间距统一优化"
```

---

### Task 16: 修复ArtPlayer控制按钮触摸目标

**Files:**
- Modify: `src/styles/artplayer-mobile.css:61`

**问题:** `min-width: 32px` 低于44px标准

- [ ] **Step 1: 增大控制按钮**

将 `min-width: 32px` 改为 `min-width: 44px`

- [ ] **Step 2: 验证**

在手机横屏模式测试播放器控制

- [ ] **Step 3: 提交**

```bash
git add src/styles/artplayer-mobile.css
git commit -m "fix: ArtPlayer 控制按钮触摸目标"
```

---

### Task 17: 修复VideoCard豆瓣链接在移动端不可见

**Files:**
- Modify: `src/components/VideoCard.tsx:1466-1514`

**问题:** 豆瓣链接只在hover时显示，移动端永远不可见

- [ ] **Step 1: 添加移动端可见性**

添加 `md:opacity-0 md:group-hover:opacity-100` 使移动端始终显示

- [ ] **Step 2: 验证**

在手机上测试豆瓣链接可见性

- [ ] **Step 3: 提交**

```bash
git add src/components/VideoCard.tsx
git commit -m "fix: VideoCard 豆瓣链接移动端可见"
```

---

## Phase 3: LOW优先级问题（6个）

### Task 18: 修复VideoCard心形图标可视性

**Files:**
- Modify: `src/components/VideoCard.tsx:1278`

**问题:** 18px图标在44px触摸区域内无视觉提示

- [ ] **Step 1: 添加背景或边框**

添加半透明背景使触摸区域可见

- [ ] **Step 2: 验证**

在手机上测试收藏按钮

- [ ] **Step 3: 提交**

```bash
git add src/components/VideoCard.tsx
git commit -m "fix: VideoCard 心形图标可视性"
```

---

### Task 19: 修复MobileActionSheet关闭按钮过小（与Task 12合并）

**Files:**
- 已在Task 12修复

- [ ] **Step 1: 跳过**

此问题已在Task 12中修复

---

### Task 20: 修复ModernNav关闭按钮过小（与Task 13合并）

**Files:**
- 已在Task 13修复

- [ ] **Step 1: 跳过**

此问题已在Task 13中修复

---

### Task 21: 修复首页内容与导航栏重叠

**Files:**
- Modify: `src/app/page.tsx:875`

**问题:** `-mt-2` 导致内容上移与固定导航栏重叠

- [ ] **Step 1: 调整边距**

将 `-mt-2` 改为 `mt-0`，确保内容不与导航栏重叠

- [ ] **Step 2: 验证**

在手机上测试首页滚动

- [ ] **Step 3: 提交**

```bash
git add src/app/page.tsx
git commit -m "fix: 首页内容边距修复"
```

---

### Task 22: 修复VideoCard标题在窄卡片上过小

**Files:**
- Modify: `src/components/VideoCard.tsx:1689-1701`

**问题:** `text-xs` 在窄卡片上不可读

- [ ] **Step 1: 调整文字大小**

将 `text-xs` 改为 `text-xs sm:text-sm`

- [ ] **Step 2: 验证**

在320px视口测试卡片标题

- [ ] **Step 3: 提交**

```bash
git add src/components/VideoCard.tsx
git commit -m "fix: VideoCard 标题文字大小优化"
```

---

### Task 23: 修复MobileHeader标题溢出

**Files:**
- Modify: `src/components/MobileHeader.tsx:66`

**问题:** `text-[1.35rem]` 固定大小在窄屏幕溢出

- [ ] **Step 1: 改为响应式文字**

将 `text-[1.35rem]` 改为 `text-[1.2rem] sm:text-[1.35rem]`

- [ ] **Step 2: 验证**

在320px视口测试标题

- [ ] **Step 3: 提交**

```bash
git add src/components/MobileHeader.tsx
git commit -m "fix: MobileHeader 标题响应式"
```

---

### Task 24: 修复弹幕发送框颜色选择器触摸目标

**Files:**
- Modify: `src/components/DanmuSendBox.tsx:83`

**问题:** `w-8 h-8` 触摸目标不足

- [ ] **Step 1: 增大颜色选择器**

将 `w-8 h-8` 改为 `w-10 h-10`

- [ ] **Step 2: 验证**

在手机上测试弹幕颜色选择

- [ ] **Step 3: 提交**

```bash
git add src/components/DanmuSendBox.tsx
git commit -m "fix: 弹幕颜色选择器触摸目标"
```

---

### Task 25: 修复PlaylistManager关闭按钮过小

**Files:**
- Modify: `src/components/PlaylistManager.tsx:199`

**问题:** `p-1.5` 导致约28px触摸目标

- [ ] **Step 1: 增大关闭按钮**

将 `p-1.5` 改为 `p-3`

- [ ] **Step 2: 验证**

在手机上测试片单管理关闭

- [ ] **Step 3: 提交**

```bash
git add src/components/PlaylistManager.tsx
git commit -m "fix: PlaylistManager 关闭按钮触摸目标"
```

---

## Phase 4: 验证和部署

### Task 26: 完整构建验证

- [ ] **Step 1: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 2: 构建**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: 提交并推送**

```bash
git add -A
git commit -m "feat: 整站移动端UX改善 - 20个关键问题修复"
git push origin main
```

- [ ] **Step 4: 验证生产环境**

等待CI/CD完成后验证所有修复生效
