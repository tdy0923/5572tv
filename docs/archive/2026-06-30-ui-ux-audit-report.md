# 5572.net 前端 UI/UX 审计报告

> 审计时间: 2026-06-30
> 覆盖范围: 全页面、全设备分辨率、用户视角、管理员视角

## 严重问题 (Critical) - 必须修复

### 1. 播放页播放器高度在小屏手机上溢出

**文件:** `src/app/play/page.tsx:4622`

```
h-[50vh] min-h-[280px]
```

iPhone SE (568px) 等小屏手机，播放器+选集面板超出视口，导致内容被裁剪或不可用。

### 2. 播放页选集面板在小屏上布局不合理

**文件:** `src/app/play/page.tsx:4610-4719`
移动端选集按钮宽度不足，长标题 episode 按钮水平溢出。

### 3. 下载页 QR 码在手机屏幕占比过大

**文件:** `src/app/download/page.tsx:31-36`

```
w-[140px] h-[140px]
```

320px 宽度的手机上占 43%，挤压下载按钮等关键操作区。

## 高优先级问题 (High)

### 4. 管理后台侧边栏在小屏上 sticky 定位干扰内容

**文件:** `src/app/admin/_content.tsx:421`
`lg:` 以下无明确堆叠行为，`sticky top-24` 可能遮挡内容。

### 5. SkipController 可拖拽面板在手机上可能出界

**文件:** `src/components/SkipController.tsx:1543-1556`
`max-w-sm` (384px) + 绝对定位，拖到边缘可能部分不可见。删除按钮 `px-1.5 py-0.5` 远低于 44px 触控目标。

### 6. SkipController 设置按钮标签在移动端隐藏

**文件:** `src/components/SkipController.tsx:1653-1681`
移动端只剩齿轮图标，功能发现性差。

### 7. 选集面板源名称截断在触摸设备上不可用

**文件:** `src/components/EpisodeSelector.tsx:615`
`truncate` + hover tooltip 在触摸设备上无效。

### 8. VideoCard 多个徽章在小卡片上拥挤重叠

**文件:** `src/components/VideoCard.tsx:1446-1465, 1530-1573, 1577-1631`
评分徽章、来源计数徽章、AI 按钮在小卡片上互相挤压。

### 9. 下载弹窗关闭按钮触控区域过小

**文件:** `src/components/download/DownloadPanel.tsx:139-156`
`w-5 h-5` SVG 图标无足够内边距。

## 中等优先级问题 (Medium)

### 10. 上/下一集按钮触控高度不足 44px

**文件:** `src/app/play/page.tsx:4770-4786`
`py-3` (12px) 总高度约 36-40px，低于推荐值。

### 11. 首页胶囊切换标签可能水平溢出

**文件:** `src/components/home/HomeContentView.tsx`
窄屏下多个标签无横向滚动指示。

### 12. 搜索列表海报图片在手机太小

**文件:** `src/app/search/_content.tsx:163`
`h-28 w-20` (112x80px) 缩略图细节不清。

### 13. 底部导航文字过小 (10px)

**文件:** `src/components/layout/PhoneLayout.tsx:42-52`
`text-[10px]` 对部分用户可读性差。

### 14. 头部 Logo 可能与返回按钮重叠

**文件:** `src/components/PageLayout.tsx:57-77`
窄屏 (< 340px) 下 Logo 文字可能与其他元素重叠。

### 15. AI 问答按钮仅桌面端可见

**文件:** `src/components/VideoCard.tsx:1577-1631`
`hidden md:block` 移动端完全无法访问 AI 功能。

### 16. ArtPlayer 弹幕设置面板可能与其他 UI 重叠

**文件:** `src/app/globals.css:453-498`
`z-60` 可能与选集面板或播放器控件重叠。

### 17. 下载页功能网格平板端未优化

**文件:** `src/app/download/page.tsx:234`
平板 (640-1023px) 仍为 2 列，未利用横向空间。

## 低优先级问题 (Low)

### 18. 全局隐藏滚动条可能引起困惑

**文件:** `src/app/globals.css:346-354`
桌面端移除滚动位置视觉反馈。

### 19. VirtualGrid 列检测依赖 ResizeObserver 可能有竞态

**文件:** `src/components/VirtualGrid.tsx:46-61`
方向旋转时可能计算错误。

### 20. PageLayout 两种移动端布局间距不一致

**文件:** `src/components/PageLayout.tsx`
现代导航 `pt-[44px]` vs 传统导航 `mt-14`。

### 21. 下载页 Hero 使用 `min-h-screen` 导致移动端地址栏跳动

**文件:** `src/app/download/page.tsx:90`
应使用 `min-h-dvh`。

## 做得好的部分 (Positive Findings)

1. Safe Area 处理正确 (`env(safe-area-inset-bottom)`)
2. Z-Index 层级系统完善 (`globals.css:56-76`)
3. VideoCard 使用容器查询适配 (`@[180px]`)
4. 有独立的移动端组件 (`PhoneLayout`, `PhonePlayerControls`)
5. 触摸设备动画已禁用 (`@media (hover: none)`)
6. 移动端 backdrop-blur 已禁用防闪烁
7. 选集按钮触控目标符合标准 (`min-h-[44px]`)
