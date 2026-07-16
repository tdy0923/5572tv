# 5572.net 深度审计报告

**审计时间**: 2026-07-15  
**审计范围**: 全项目（Next.js Web + Flutter APP + Cloudflare Worker）  
**代码规模**: 535 TypeScript/TSX 文件, 150,362 行; Flutter 130+ Dart 文件

---

## 一、审计总览

| 维度          | P0/P1 问题数            | 状态   |
| ------------- | ----------------------- | ------ |
| 安全漏洞      | 9 (3 P0 + 6 P1)         | 需修复 |
| 代码质量      | 13                      | 需优化 |
| 性能问题      | 8 (HIGH)                | 需优化 |
| Flutter APP   | 6 (1 P0 + 3 P1)         | 需修复 |
| 配置/部署     | 9 (2 CRITICAL + 4 HIGH) | 需修复 |
| 代码冲突/重复 | 3 MEDIUM                | 需处理 |
| Git 历史      | 无误删，有历史回退      | 安全   |
| 代码闭合      | 无语法错误              | 通过   |
| 前端链路      | 视频播放链路完整        | 通过   |
| 可视化审计    | 登录页正常，下载页正常  | 通过   |

---

## 二、P0/P1 安全漏洞（必须修复）

### P0-1: vm2 沙箱逃逸（CVE-2023-37466 等）

- **文件**: `package.json:68`, `source-script/route.ts:2`, `source-script-executor.ts:3`, `ad-filter/route.ts:9`
- **影响**: vm2 已废弃，多个 CVE 允许 RCE。管理员可提交恶意脚本实现远程代码执行
- **修复**: 替换为 `isolated-vm` 或 Node.js 内置 `vm.Script`

### P0-2: Cloudflare Worker 开放 SSRF 代理

- **文件**: `proxy.worker.js:55-151`
- **影响**: `/api/proxy/m3u8`、`/api/proxy/segment`、`/api/proxy/key` 无域名白名单，可代理内网服务
- **修复**: 添加 `isPrivateIP()` 检查，匹配 `ssrf-protection.ts` 逻辑

### P0-3: Telegram Webhook 无认证

- **文件**: `telegram/set-webhook/route.ts:10-66`
- **影响**: 任何人可重定向 Bot Webhook，拦截所有 Telegram 认证消息
- **修复**: 添加 `ensureAdmin(request)` 认证

### P0-4: GitHub Actions 硬编码凭据（配置审计）

- **文件**: `.github/workflows/deploy.yml:54-60`
- **影响**: 用户名 Danny、密码 Danny0923、Redis 凭据明文写在 CI 配置中
- **修复**: 改用 `${{ secrets.USERNAME }}` 等引用

### P0-5: release.keystore 提交到仓库

- **文件**: `release.keystore`（根目录）
- **影响**: Android 签名密钥泄露
- **修复**: 加入 `.gitignore`，从 git 历史中清除

### P0-6: Flutter key.properties 明文密码

- **文件**: `flutter_app/android/key.properties:2-4`
- **影响**: storePassword=5572tv, keyPassword=5572tv 提交到仓库
- **修复**: 加入 `.gitignore`，CI 中通过 secrets 注入

### P1-1: CSP `'unsafe-inline'` 使 Nonce 失效

- **文件**: `proxy.ts:258`
- **影响**: `'unsafe-inline'` 优先于 nonce，XSS 可执行任意脚本
- **修复**: 移除 `'unsafe-inline'`，仅用 `nonce-${nonce}`

### P1-2: Telegram 新用户密码泄露在可读 Cookie

- **文件**: `telegram/verify/route.ts:385`
- **影响**: 自动生成的密码放在 `httpOnly: false` 的 cookie 中 60 秒
- **修复**: 改用 `httpOnly: true` 或服务端一次性标志

### P1-3: Cron Token 在 URL 查询字符串中

- **文件**: `cron/route.ts:181`
- **影响**: CRON_TOKEN 默认等于 PASSWORD，URL 会被日志记录
- **修复**: 改用 `Authorization` 请求头

### P1-4: 登录密码非时序安全比较

- **文件**: `login/route.ts:225`
- **影响**: localstorage 模式用 `!==` 比较密码，可被时序攻击逐字符猜解
- **修复**: 改用 `crypto.timingSafeEqual`

### P1-5: `user_info` Cookie 可被 JS 读取

- **文件**: `lib/auth.ts:63`
- **影响**: `{username, role}` 明文暴露给 XSS
- **修复**: 改用 `httpOnly: true` 或改存 localStorage

### P1-6: 内存限流在 Serverless 无效

- **文件**: `login/route.ts:171`, `register/route.ts:85`
- **影响**: `new Map()` 在 Vercel 每次冷启动重置，限流失效
- **修复**: 用 Upstash Redis 实现分布式限流

### P1-7: iOS NSAllowsArbitraryLoads

- **文件**: `flutter_app/ios/Runner/Info.plist:54`
- **影响**: 禁用 iOS App Transport Security，允许所有 HTTP 请求
- **修复**: 改用 `NSExceptionDomains` 限定特定域名

### P1-8: Flutter Android cleartext traffic 矛盾配置

- **文件**: `flutter_app/android/app/src/main/AndroidManifest.xml:21`
- **影响**: `usesCleartextTraffic="true"` 覆盖了 `network_security_config.xml` 的限制
- **修复**: 改为 `false`，依赖 network_security_config.xml

---

## 三、代码质量问题

### 3.1 超大文件（需拆分）

| 行数  | 文件                                                   | 严重度   |
| ----- | ------------------------------------------------------ | -------- |
| 5,791 | `src/app/play/PlayPageClient.tsx`                      | CRITICAL |
| 2,914 | `src/lib/db.client.ts`                                 | HIGH     |
| 2,493 | `src/app/live/_content.tsx`                            | HIGH     |
| 2,333 | `src/app/tvbox/page.tsx`                               | HIGH     |
| 1,862 | `src/components/VideoCard.tsx`                         | HIGH     |
| 1,716 | `src/lib/redis-base.db.ts`                             | HIGH     |
| 1,567 | `src/lib/upstash.db.ts`                                | HIGH     |
| 2,156 | `flutter_app/lib/screens/player_screen.dart`           | HIGH     |
| 1,763 | `flutter_app/lib/widgets/video_menu_bottom_sheet.dart` | HIGH     |
| 1,625 | `flutter_app/lib/screens/search_screen.dart`           | HIGH     |

**PlayPageClient.tsx** 有 43 个 useState、22 个 useEffect、34 个 useRef，是单文件最大风险点。

### 3.2 死代码

- `src/core/` 整个目录（4个文件）— 零引用，完全死代码
- `src/ui/` 空目录
- `src/hooks/useHomePageQueries.ts.bak` — 残留备份文件

### 3.3 TypeScript 严格性不足

```json
// tsconfig.json 矛盾配置
"strict": true,
"strictNullChecks": false,  // 禁用了最关键的检查
"noImplicitAny": false       // 允许隐式 any
```

- `: any` 类型标注: **351 处**
- `as any` 类型断言: **254 处**
- `eslint-disable no-console`: **221 处**

### 3.4 空 catch 块

- **37 个完全空的 `catch {}`** 在前端代码中
- **79 个空 catch 在 API 路由中**
- **6 个空 catch 在认证代码** (`lib/auth.ts`) 中

### 3.5 代码重复

| 重复项             | 文件数                                         | 说明                              |
| ------------------ | ---------------------------------------------- | --------------------------------- |
| `fetchWithTimeout` | 4 个独立实现                                   | 各自独立的 AbortController 模式   |
| `fetchWithRetry`   | 3 个独立实现                                   | 重试逻辑重复                      |
| 数据库 API 路由    | favorites/reminders/playrecords 三文件近乎相同 | 应提取工厂函数                    |
| 认证检查样板       | 所有数据 API 路由                              | 相同的 getAuthInfoFromCookie 模式 |

---

## 四、性能问题

### 4.1 图片优化完全禁用

- `next.config.js:37` — `images.unoptimized: true`
- 海报以原始分辨率（500KB+）传输，无 WebP/AVIF 转换

### 4.2 服务端请求无缓存

- `src/app/page.tsx:13` — `cache: 'no-store'`，每次页面加载都重新请求

### 4.3 Emby N+1 查询

- `src/app/api/detail/route.ts:186-229` — 每集单独请求 stream URL，100集=100+次API调用

### 4.4 Flutter PlayerScreen setState 风暴

- `flutter_app/lib/screens/player_screen.dart:69` — `_state.addListener(() { setState(() {}); })` 每次状态变更触发全量重建

### 4.5 Flutter VideoCard FutureBuilder 在 build() 中

- `flutter_app/lib/widgets/video_card.dart:63` — 每次重建创建新 Future，导致图片闪烁

### 4.6 双重缓存层

- `src/contexts/GlobalCacheContext.tsx` 与 TanStack Query 缓存同一批数据

### 4.7 Artplayer CSS 全站加载

- `src/app/globals.css:2-6` — 6个 artplayer CSS 文件在所有页面加载，而非仅播放页

### 4.8 VideoCard 内联 style 对象

- `src/components/VideoCard.tsx` 20+ 处 `style={{...}}` 每次渲染创建新对象，破坏 memo

---

## 五、Flutter APP 问题

### 5.1 内存泄漏

- `video_menu_bottom_sheet.dart:282` — Animation listener 累积，每次 `_animateSheetHeight` 添加新 listener 但不移除
- `douban_cache_service.dart:308` — `Stream.periodic` 的 subscription 未保存/取消
- `player_screen.dart:69` — 匿名 ChangeNotifier listener 未保存引用，无法 removeListener

### 5.2 `void func() async` 反模式（14处）

- `player_screen.dart:94,106,273`
- `search_screen.dart:425`
- `login_screen.dart:34,91`
- 等 — 异步方法返回 void，错误被静默吞掉

### 5.3 MediaKit 初始化 Bug

- `main.dart:36-42` — `Future.wait` 中同时启动 MediaKit 和一个 5 秒超时，超时异常总会被触发（即使 MediaKit 成功初始化）

### 5.4 print() 在生产代码中

- `home_screen.dart:75`, `live_player_screen.dart:133,154`, `player_state.dart:770` 等
- Android logcat 洪泛导致卡顿

### 5.5 Podfile 平台版本被注释

- `ios/Podfile:2` — `# platform :ios, '13.0'` 被注释，可能导致 CocoaPods 使用过旧的最低版本

### 5.6 http + dio 双重依赖

- `pubspec.yaml:38,46` — 两个 HTTP 客户端库同时存在，增加包体积

---

## 六、配置与部署问题

### 6.1 CI 流水线

- 无任何测试步骤（无 `pnpm test`、无 `pnpm typecheck`）
- Docker pnpm 版本未锁定（`pnpm@latest`）
- deploy.yml SSH 未验证主机密钥
- deploy.yml 使用 root 用户部署

### 6.2 ESLint 未启用 TypeScript 规则

- `@typescript-eslint/eslint-plugin` 在 devDependencies 中但未在 `eslint.config.mjs` 中使用
- `no-console` 仅为 warn 级别

### 6.3 .husky 被 gitignore

- `.gitignore` 排除了 `.husky/`，新克隆无法获得 pre-commit hooks

---

## 七、Git 历史审计

### 无误删

- 所有文件删除均为有意操作（manga 功能因 CDN 防盗链移除、死代码清理）
- 无合并冲突标记（`<<<<<<`）残留在代码中

### 历史回退记录

- `middleware.ts` 被删除，逻辑合并到 `proxy.ts`（CSP nonce 处理）
- 认证代码有多次回退（cookie 编码、盐值生成、登录响应），表明该区域历史上不稳定
- Cloudflare Worker 有地理封锁回退和防盗链绕过更新

### 视频播放链路

- 活跃维护：源切换、手机测速、中文源名称处理均有修复
- SSRF 保护在多次安全加固中更新
- 无功能性回退

---

## 八、代码闭合与语法审计

| 检查项                           | 结果                           |
| -------------------------------- | ------------------------------ |
| TypeScript 编译 (`tsc --noEmit`) | **0 错误** ✅                  |
| ESLint（关键文件）               | **0 错误**，~40 警告 ✅        |
| 括号/花括号/方括号平衡           | **全部平衡** ✅                |
| HTML/JSX 标签闭合                | **无未闭合标签** ✅            |
| Flutter analyze                  | **0 错误**，133 info 级提示 ✅ |
| next.config.js 语法              | **通过** ✅                    |
| proxy.worker.js 语法             | **通过** ✅                    |
| 合并冲突标记                     | **无残留** ✅                  |

---

## 九、前端机制链路审计

### 视频播放完整链路

```
VideoCard → /play → PlayPageClient
  ↓
useSourceSearch → /api/search（并行多源，3秒提前返回，20秒超时）
  ↓
Source selected → /api/detail（Emby 或标准 API）
  ↓
Episode URL → /api/proxy/m3u8（Emby 跳过）
  ↓
/api/proxy/m3u8 → fetch M3U8 → rewrite URLs → segments/keys
  ↓
Cloudflare Worker（proxy.worker.js）镜像相同路由
  ↓
HLS.js / native HLS 播放
```

**链路状态: 完整，无断点** ✅

### 各层错误处理

- API 路由：400/401/403/404/500 完整
- 客户端 Hook：try/catch + 状态更新
- HLS.js：致命/非致命错误分类 + 恢复机制
- 源切换：指数退避重试，最多 50 次会话失败

### 注意事项

- **Emby 源跳过 m3u8 代理** — 无 CORS 代理、无广告过滤、无 URL 重写（设计如此）
- **代理双部署** — Next.js API 路由 + Cloudflare Worker 同时存在，修改逻辑需同步更新两处
- **3层回退** — fetchWithRetry → CDN 策略 → 302 重定向 → HLS.js 错误恢复 → 源切换

---

## 十、可视化审计

| 页面             | 状态 | 说明                                                          |
| ---------------- | ---- | ------------------------------------------------------------- |
| 首页（未登录）   | ✅   | 正确显示登录页，5572影视品牌正常                              |
| 搜索页（未登录） | ✅   | 正确跳转登录页                                                |
| 下载页           | ✅   | 无需登录，Android/iOS/TV 选项正常，QR 码正常，v1.9.5 版本显示 |
| 管理页（未登录） | ✅   | 正确跳转登录页                                                |
| 手机首页         | ✅   | 响应式布局正常，登录表单适配                                  |
| 控制台错误       | ✅   | 首页无 JS 错误                                                |

**未登录状态下所有受保护页面正确重定向到登录页** ✅

---

## 十一、重复/冲突代码

### 数据库层架构

```
db.ts（工厂） → STORAGE_TYPE 选择
  ├── redis-base.db.ts → BaseRedisStorage（抽象基类）
  │     ├── redis.db.ts → RedisStorage
  │     └── kvrocks.db.ts → KvrocksStorage
  └── upstash.db.ts → UpstashRedisStorage（独立实现）
```

**冲突风险**:

- `video-cache.ts:29` 绕过 `db.ts` 工厂，直接创建 KvrocksStorage 实例。若未设置 `KVROCKS_URL`，视频缓存静默失败
- `admin-auth.ts:34` 读取 `NEXT_PUBLIC_STORAGE_TYPE`，而 `db.ts` 读取 `STORAGE_TYPE` + `KVROCKS_URL`，两者可能不一致导致错误的认证路径

### 认证机制

- **单一链路**，无冲突 ✅
- `getAuthInfoFromCookie()` → `ensureAdmin()` / `getAdminRoleFromRequest()`

### 限流

- 3 个独立系统，无重叠 ✅
- proxy.ts（视频代理）、danmu/send（弹幕）、admin.types.ts（配置）

---

## 十二、优先修复计划

### 第一批（立即修复，1-2天）

1. ~~vm2 替换为 isolated-vm~~（P0 安全）
2. ~~Telegram Webhook 添加认证~~（P0 安全）
3. ~~Cloudflare Worker SSRF 防护~~（P0 安全）
4. ~~GitHub Actions 凭据改为 secrets~~（P0 配置）
5. ~~key.properties / release.keystore 移除~~（P0 安全）
6. CSP 移除 unsafe-inline（P1 安全）
7. Cron Token 改用 Authorization header（P1 安全）
8. 登录密码改用 timingSafeEqual（P1 安全）

### 第二批（本周，3-5天）

9. PlayPageClient.tsx 拆分（5791行 → 8-10个模块）
10. 启用 strictNullChecks（修复 ~600+ 类型错误）
11. 删除 src/core/、src/ui/ 死代码
12. 删除 .bak 备份文件
13. 修复 Flutter MediaKit 初始化 bug
14. 修复 Flutter video_menu_bottom_sheet listener 泄漏

### 第三批（下周，持续优化）

15. 合并 upstash.db.ts 和 redis-base.db.ts
16. 提取 fetchWithTimeout/fetchWithRetry 共享工具
17. 提取 API 认证检查中间件
18. 启用图片优化（images.unoptimized: false）
19. 添加全局错误边界（global-error.tsx）
20. CI 添加测试步骤

---

## 十三、审计结论

**项目整体健康度**: 中等偏上

- **代码结构**: 功能完整，链路清晰，但有大量技术债务（超大文件、重复代码、类型不安全）
- **安全性**: 存在多个 P0 溢洞需要立即修复，特别是 vm2 和 SSRF
- **性能**: 图片优化禁用、N+1 查询、Flutter setState 风暴是主要瓶颈
- **前端链路**: 视频播放链路完整，代理/CDN 绕过机制正常工作
- **可视化**: 页面布局正常，响应式适配正常，无控制台错误
- **Git 历史**: 无误删，无合并冲突，关键路径有活跃维护
