# 5572影视 深度审计报告 v2

> 审计日期: 2026-06-24  
> 审计范围: UI/UX · 性能 · 功能 · 客户端 · 安全

---

## 一、播放器 UI/UX 问题（Critical）

### 1.1 手机播放器尺寸过小

- **文件**: `src/app/play/page.tsx:6430`
- **问题**: 播放器容器 `h-[260px]`，在 375px 宽的手机上只有 260px 高（占屏幕 ~40%）
- **影响**: 用户看不清画面，操作困难
- **修复**: 改为 `h-[56vw] sm:h-[360px] md:h-[420px] lg:h-full`，基于宽度的16:9比例

### 1.2 选集面板占屏幕空间

- **文件**: `src/app/play/page.tsx:6524`
- **问题**: 选集面板 `max-h-[35vh]` 在手机上与播放器堆叠，进一步压缩播放器空间
- **修复**: 手机端选集面板改为底部抽屉或Tab切换，不与播放器同时堆叠

### 1.3 手机横屏播放未利用全屏宽度

- **问题**: 竖屏时播放器被限制在260px，横屏时未自动全屏
- **修复**: 检测横屏时自动进入沉浸式模式，隐藏状态栏和导航栏

### 1.4 触控目标尺寸不一致

- **文件**: `src/styles/artplayer-mobile.css`
- **问题**: 仅 `max-width: 380px` 以下才应用 44px 触控目标，380-768px 之间按钮可能太小
- **修复**: 将触控目标规则应用到 `max-width: 768px`

---

## 二、性能问题（High）

### 2.1 首页数据加载

- **文件**: `src/hooks/useHomePageQueries.ts`
- **现状**: ✅ 已使用 TanStack Query 并行获取6个数据源
- **问题**: 6个豆瓣/Bangumi API请求全部在客户端发起，首次加载白屏时间长
- **修复**: 部分数据（如热门电影/电视剧）改为SSR或ISR预取

### 2.2 播放页面体积过大

- **文件**: `src/app/play/page.tsx` (7467行)
- **问题**: 单文件7467行，包含播放器、选集、评论、WebSR等所有逻辑
- **修复**: 拆分为独立组件，使用 `next/dynamic` 懒加载非首屏组件

### 2.3 framer-motion 体积

- **文件**: `package.json`
- **问题**: framer-motion ^12.40.0 体积较大（~60KB gzipped）
- **修复**: 检查是否可替代为 CSS transitions 或仅导入使用到的部分

### 2.4 依赖数量

- **现状**: 48 production + 34 dev dependencies
- **评估**: 中等水平，无明显冗余

---

## 三、功能审计

### 3.1 ✅ 正常工作的功能

- 登录（Danny/Danny0923）
- 搜索API
- 用户统计API
- 收藏API
- 服务器配置API
- Middleware认证

### 3.2 ⚠️ 需要验证的功能

- 用户注册流程
- 密码修改
- 释放日历
- 提醒功能
- 搜索历史
- 播放记录
- 弹幕功能
- WebSR设置
- 短剧功能
- 网盘功能

---

## 四、Flutter 客户端审计

### 4.1 项目结构

- **路径**: `flutter_app/`
- **依赖**: media_kit (播放器), dio (网络), provider (状态), cached_network_image (图片缓存)
- **评估**: 依赖选择合理

### 4.2 播放器

- **文件**: `flutter_app/lib/screens/player_screen.dart`
- **文件**: `flutter_app/lib/widgets/mobile_player_controls.dart`
- **文件**: `flutter_app/lib/widgets/video_player_widget.dart`
- **需检查**: TV D-pad导航支持、横竖屏切换、画中画

### 4.3 TV 客户端

- **文件**: `flutter_app/lib/screens/tv_screen.dart`
- **文件**: `flutter_app/lib/widgets/pc_player_controls.dart`
- **需检查**: 遥控器方向键导航、焦点管理、大字体适配

---

## 五、CSS/样式问题

### 5.1 平板断点已添加 ✅

- **文件**: `src/app/globals.css:288-305`
- **状态**: 768-1080px 平板断点已存在

### 5.2 暗色模式强制覆盖

- **文件**: `src/app/globals.css:462-499`
- **问题**: 大量 `!important` 强制覆盖 Tailwind 4 OKLCH 颜色
- **建议**: 等 Tailwind 4 稳定后移除 workaround

### 5.3 重复的滚动条隐藏

- **文件**: `src/app/globals.css:274-286` 和 `src/app/globals.css:288-296`
- **问题**: 两套滚动条隐藏规则重复定义

---

## 六、控制台错误

### 6.1 Bitwarden 扩展噪音（非网站问题）

- 大量 "back/forward cache" 错误来自 Bitwarden 浏览器扩展
- **结论**: 非本站问题，无需处理

### 6.2 console-log.service.ts

- 全局拦截 console.log，将扩展日志也输出
- **建议**: 生产环境禁用或过滤非本站日志

---

## 七、修复优先级

| 优先级 | 问题                  | 状态                                  |
| ------ | --------------------- | ------------------------------------- |
| P0     | 播放器手机尺寸过小    | ✅ 已修 (h-[50vh])                    |
| P0     | 选集面板占屏幕空间    | ✅ 已修 (可折叠)                      |
| P1     | 横屏沉浸式播放        | ✅ 已修 (自动全屏)                    |
| P1     | 触控目标380-768px区间 | ✅ 已修 (768px断点)                   |
| P2     | play page拆分         | 🔄 进行中 (7487→7258, utils.ts已提取) |
| P2     | 首页组件懒加载        | ✅ 已修 (next/dynamic)                |
| P3     | framer-motion优化     | ✅ 仅1处使用，影响小                  |
| P3     | 滚动条规则去重        | ✅ 已修                               |

---

## 八、Flutter/客户端待检查项

- [x] TV D-pad焦点管理 — 已集成TVRemoteAdapter到HomeScreen和TvScreen
- [ ] 播放器横竖屏切换
- [ ] 画中画（PiP）支持
- [ ] 离线缓存策略
- [ ] 推送通知
- [ ] 版本更新检查
