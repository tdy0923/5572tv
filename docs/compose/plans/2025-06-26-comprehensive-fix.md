# 5572 全面整改实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task.

**Goal:** 修复移动端播放、PWA问题、APP图标、建立VI设计系统

**Architecture:** 系统化修复，按优先级分批执行，每批独立测试验证

**Tech Stack:** Flutter, Next.js, TypeScript, Tailwind CSS

## Global Constraints
- 品牌色: #f4c24d (金色)
- 深色背景: #0a0a0a
- 触摸目标: ≥44px
- 本地测试环境可用

---

## Phase 1: 修复移动端播放（最高优先级）

### Task 1: 修复Flutter视频播放器配置

**Files:**
- Modify: `flutter_app/lib/widgets/video_player_widget.dart`
- Modify: `flutter_app/lib/screens/player_screen.dart`

**问题:** 移动端无法播放视频

**修复步骤:**
- [ ] 检查media_kit配置
- [ ] 检查视频URL处理
- [ ] 检查网络请求头
- [ ] 添加错误日志
- [ ] 本地测试验证

### Task 2: 修复视频代理API

**Files:**
- Modify: `src/app/api/video-proxy/route.ts`

**问题:** 视频代理可能返回502错误

**修复步骤:**
- [ ] 检查代理逻辑
- [ ] 添加错误处理
- [ ] 测试视频播放

---

## Phase 2: 修复PWA问题

### Task 3: 优化Service Worker

**Files:**
- Modify: `public/sw.js`
- Modify: `public/manifest.json`

**问题:** PWA功能不完整

**修复步骤:**
- [ ] 检查SW缓存策略
- [ ] 添加离线页面
- [ ] 优化缓存清理
- [ ] 测试PWA安装

### Task 4: 添加PWA离线页面

**Files:**
- Create: `public/offline.html`

**修复步骤:**
- [ ] 创建离线页面
- [ ] 更新SW配置
- [ ] 测试离线访问

---

## Phase 3: APP图标重设计

### Task 5: 重新设计APP图标（金色主题）

**Files:**
- Modify: `flutter_app/android/app/src/main/res/mipmap-*/ic_launcher.png`
- Modify: `public/icons/*`

**问题:** 黑色图标与网站不搭配

**修复步骤:**
- [ ] 使用Agnes AI生成金色主题图标
- [ ] 更新所有尺寸图标
- [ ] 测试APP启动显示

### Task 6: 生成多尺寸图标

**Files:**
- Generate: `flutter_app/android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- Generate: `flutter_app/android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- Generate: `flutter_app/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- Generate: `flutter_app/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- Generate: `flutter_app/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

**修复步骤:**
- [ ] 使用Agnes AI生成图标
- [ ] 下载到正确目录
- [ ] 替换旧图标

---

## Phase 4: VI设计系统

### Task 7: 建立VI设计规范文档

**Files:**
- Create: `docs/VI_DESIGN_SYSTEM.md`

**内容:**
- [ ] 颜色系统
- [ ] 字体规范
- [ ] 图标规范
- [ ] 间距规范
- [ ] 组件规范

### Task 8: 更新Flutter主题配置

**Files:**
- Modify: `flutter_app/lib/theme/app_theme.dart`

**修复步骤:**
- [ ] 更新品牌色为#f4c24d
- [ ] 添加深色/浅色主题
- [ ] 统一组件样式

---

## Phase 5: 本地测试验证

### Task 9: 配置本地测试环境

**Files:**
- Create: `scripts/setup-test-env.sh`

**修复步骤:**
- [ ] 检查Flutter SDK
- [ ] 检查Android SDK
- [ ] 配置模拟器

### Task 10: 执行完整测试

**测试清单:**
- [ ] Flutter APP启动
- [ ] 视频播放功能
- [ ] PWA安装
- [ ] 下载功能
- [ ] 图标显示
- [ ] 移动端适配

---

## 实施顺序

| Phase | 任务数 | 预计时间 | 依赖 |
|-------|--------|----------|------|
| Phase 1 | 2 | 2小时 | 无 |
| Phase 2 | 2 | 1小时 | Phase 1 |
| Phase 3 | 2 | 2小时 | 无 |
| Phase 4 | 2 | 1小时 | 无 |
| Phase 5 | 2 | 2小时 | Phase 1-4 |

**总计: 10个任务, 8小时**
