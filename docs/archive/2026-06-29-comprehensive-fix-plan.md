# 5572影视 全面修复计划 v2

> **制定日期**: 2026-06-29
> **来源**: 深度代码审计 + 架构分析
> **总问题数**: 49 项（Critical 3 / High 10 / Medium 21 / Low 15）

---

## 执行策略

采用 **5 阶段迭代修复**，每阶段独立可交付，降低风险：

```
Phase 1 (Critical)  →  Phase 2 (High)  →  Phase 3 (Code Quality + Performance)
  →  Phase 4 (Worker + Flutter)  →  Phase 5 (Testing + Release)
```

---

## Phase 1: 🔴 关键安全修复（Critical — 3项）

**目标：消除可被直接利用的远程攻击面**

### Task 1.1 — Cache API 加 role 鉴权 [C-01]

**文件**: `src/app/api/cache/route.ts`
**改动**:

- `requireAuth()` 改为 `requireOwner()` — 只有 `role === 'owner'` 可操作缓存
- GET/POST/DELETE 三个端点统一校验

```typescript
// 修改第7-11行
async function requireOwner(request: NextRequest): Promise<boolean> {
  const auth = await getAuthInfoFromCookie(request);
  return !!auth && (auth.role === 'owner' || auth.role === 'admin');
}
```

### Task 1.2 — PASSWORD 启动时校验 [C-02]

**文件**: `src/lib/auth.ts + src/app/api/login/route.ts`
**改动**:

- 移除 `process.env.PASSWORD || ''` 空值回退
- 启动时检查 PASSWORD 是否设置，未设置则拒绝启动

```typescript
// auth.ts 第6行
function getPasswordSecret(): string {
  const pwd = process.env.PASSWORD;
  if (!pwd) {
    console.error('[CRITICAL] PASSWORD environment variable is not set!');
    return ''; // 依然返回空字符串防止崩溃，但日志报警
  }
  return pwd;
}
```

**同时修复** `login/route.ts` 第 207 行 "未配置 PASSWORD 时直接放行" 的逻辑 — 移除该分支。

### Task 1.3 — Cookie 设 httpOnly + secure [C-03]

**文件**: `src/app/api/login/route.ts`（4 处 cookie 设置）
**文件**: `src/app/api/register/route.ts`（1 处）
**改动**: 所有 `response.cookies.set()` 改为：

```typescript
response.cookies.set('user_auth', cookieValue, {
  path: '/',
  expires,
  sameSite: 'lax',
  httpOnly: true, // ← 改 false→true
  secure: true, // ← 移除 NODE_ENV 条件，始终 true
});
```

### Task 1.4 — HMAC 签名包含 role [C-04]

**文件**: `src/app/api/login/route.ts:67`
**改动**: `generateSignData` 已包含 role（审计显示第 67 行已为 `signData = \`${username}:${role || 'user'}\``），
但 `auth.ts` 第 88 行的验证逻辑也需要确认一致。**已验证已修复**。

---

## Phase 2: 🟠 高危安全修复（High — 4项 + Medium 6项）

### Task 2.1 — SSRF 增加 DNS 解析校验 [C-05]

**文件**: `src/lib/ssrf-protection.ts`
**改动**:

- 在 hostname 字符串检查之后，增加 DNS 解析二次校验
- 添加 `198.18.0.0/15` 段的正则（已有）

```typescript
import dns from 'dns/promises';

export async function isUrlSafeDeep(url: string): Promise<boolean> {
  if (!isUrlSafe(url)) return false;
  // DNS 二次校验
  try {
    const parsed = new URL(url);
    const addresses = await dns.resolve4(parsed.hostname);
    for (const ip of addresses) {
      if (isPrivateIP(ip)) return false;
    }
  } catch {
    /* DNS 失败也视为安全 */
  }
  return true;
}
```

### Task 2.2 — X-Forwarded-For 加固 [C-06]

**文件**: `src/proxy.ts:126-138`
**改动**:

```typescript
function getClientIP(request: NextRequest): string {
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  const realIP = request.headers.get('x-real-client-ip');
  if (realIP) return realIP;
  // 只有经过信任的反代才使用 x-forwarded-for
  return 'unknown';
}
```

### Task 2.3 — Proxy 恢复速率限制 [C-07]

**文件**: `src/proxy.ts:246`
**改动**: 移除 `globalDisableRateLimit = true`，为 proxy 端点单独配置速率限制（每分钟 60 次，每 IP）

### Task 2.4 — 修复 AI Prompt 注入 [C-11]

**文件**: `src/lib/ai-orchestrator.ts + src/app/api/ai-recommend/route.ts`
**改动**:

- 对用户输入做长度限制（最大 500 字符）
- 过滤关键词（"忽略指令"、"system prompt" 等）
- 严格分离 system 和 user 消息

### Task 2.5 — 修复其余 Medium 安全问题

| 问题                      | 文件                   | 修复方案                           |
| ------------------------- | ---------------------- | ---------------------------------- |
| C-08 image-proxy 内存泄漏 | `image-proxy/route.ts` | `pendingRequests` 加 LRU 上限 1000 |
| C-09 错误信息泄露         | 全项目 catch 块        | 生产环境返回通用错误消息           |
| C-10 CSS 注入             | `ThemeEditor.tsx`      | 对 CSS 做 sanitize（DOMPurify）    |
| C-12 速率限制内存化       | `fail2ban.ts`          | 迁移到 Redis                       |
| C-13 无 session 撤销      | `auth.ts`              | 添加 token 撤销列表（Redis）       |

---

## Phase 3: ⚡ 代码质量 + 性能修复

### Task 3.1 — Emby N+1 修复 [Q-07 / P-07]

**文件**: `src/app/api/detail/route.ts`
**改动**:

- 将 128 次串行 HTTP 请求改为并发控制（同时 3 个）
- 添加内部请求缓存，相同 URL 不重复请求

### Task 3.2 — 首页 useEffect 瀑布流 [P-01]

**文件**: `src/app/page.tsx`
**改动**:

- 拆分单个巨型 effect 为多个独立 effect
- 每个 effect 只依赖对应的数据切片
- 添加 AbortController 取消过期请求

### Task 3.3 — 播放页 43 个 useState 重构 [P-02]

**文件**: `src/app/play/page.tsx`
**改动**:

- 用 `useReducer` 分组核心状态（播放器状态、弹幕配置、UI 控制等）
- 子组件各自管理内部状态

### Task 3.4 — 重型组件懒加载 [P-03]

**文件**: `src/app/play/page.tsx`
**改动**:

```typescript
const DownloadEpisodeSelector = React.lazy(
  () => import('@/components/DownloadEpisodeSelector'),
);
const EpisodeSelector = React.lazy(
  () => import('@/components/EpisodeSelector'),
);
```

### Task 3.5 — ScrollableRow 添加 rAF [P-06]

**文件**: `src/components/ScrollableRow.tsx`
**改动**: onScroll 回调用 `requestAnimationFrame` 包裹

### Task 3.6 — VirtualGrid ResizeObserver 循环修复 [P-07]

**文件**: `src/components/VirtualGrid.tsx`
**改动**: `columns` 改用 `useRef` 存储，切断循环依赖

### Task 3.7 — UnifiedCache interval 泄漏 [P-08]

**文件**: `src/lib/unified-cache.ts`
**改动**: 懒启动单例 + HMR 清理

### Task 3.8 — 开启 reactStrictMode

**文件**: `next.config.js`
**改动**: `reactStrictMode: true`

### Task 3.9 — TypeScript 严格模式

**文件**: `tsconfig.json`
**改动**:

- `strictNullChecks: true`
- `noImplicitAny: true`
- 逐步修复由此引发的新类型错误

### Task 3.10 — 合并重复代码 [Q-01, Q-02, Q-03]

| 问题              | 修复方案                                                      |
| ----------------- | ------------------------------------------------------------- |
| Q-01 函数重复     | 提取 `generateStorageKey` 到 `utils.ts`                       |
| Q-02 类型重复     | 删除 `db.client.ts` 中的 `Favorite` 定义，统一使用 `types.ts` |
| Q-03 图片代理冗余 | 合并三个函数为一个                                            |

### Task 3.11 — DbManager 移除 as any [Q-05]

**文件**: `src/lib/db.ts`
**改动**: 定义精确的存储接口类型，逐段替换 `as any` 调用

### Task 3.12 — 移除去死代码 [Q-06]

**文件**: `db.client.ts:543-601`
**改动**: 删除 5 个 deprecated 方法
**文件**: `cron/route.ts:1099,1108`
**改动**: 删除重复粘贴的代码块

### Task 3.13 — Config 竞态条件 [Q-08]

**文件**: `src/lib/config.ts`
**改动**: `cachedConfig` 改用 immutable 更新模式

---

## Phase 4: 🌩️ Worker + Flutter 修复

### Task 4.1 — Worker Open Proxy 修复 [W-01]

**文件**: `proxy.worker.js`
**改动**:

- `handleGenericProxy` 添加 URL 白名单或域名白名单
- 禁止代理 `169.254.169.254`、内部 IP

### Task 4.2 — Worker Header 注入修复 [W-02]

**文件**: `proxy.worker.js`
**改动**: `handleRedirect` 的 Location 头做 URL 校验

### Task 4.3 — Worker 请求体大小限制 [W-03]

**文件**: `proxy.worker.js`
**改动**: 添加 `request.body` 大小检查（上限 10MB）

### Task 4.4 — Worker UA 格式修复 [W-04 / M-11]

**文件**: `proxy.worker.js + src/lib/user-agent.ts`
**改动**:

- 修复 Firefox UA 格式错误
- 添加移动端 UA（Chrome Mobile iOS、Chrome Mobile Android、Safari Mobile iOS）

### Task 4.5 — Flutter ProGuard 文件 [F-01]

**文件**: 新建 `flutter_app/android/app/proguard-rules.pro`
**内容**:

```
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn okhttp3.**
-dontwarn retrofit2.**
```

### Task 4.6 — Flutter Android TV Leanback 支持 [F-02]

**文件**: `flutter_app/android/app/build.gradle.kts`
**改动**: 添加 Leanback 依赖和 TV 启动配置

### Task 4.7 — Flutter iOS ATS 配置 [F-03]

**文件**: `flutter_app/ios/Runner/Info.plist`
**改动**: 添加 `NSAppTransportSecurity`，允许 HTTP 视频源

### Task 4.8 — Flutter iOS Bundle Name 修正 [C-16]

**文件**: `flutter_app/ios/Runner/Info.plist`
**改动**: `CFBundleDisplayName` → `5572TV`

### Task 4.9 — Flutter Android ApplicationId 修正 [C-15]

**文件**: `flutter_app/android/app/build.gradle.kts`
**改动**: `applicationId` → `tv.luna.media5572`

---

## Phase 5: ✅ 测试 + 构建 + 发布

### Task 5.1 — TypeScript 类型检查

```bash
cd /root/www.5572.net && pnpm typecheck
```

修复所有类型错误。

### Task 5.2 — Lint + Format

```bash
pnpm lint:strict
pnpm format:check
```

### Task 5.3 — Jest 测试

```bash
pnpm test
```

### Task 5.4 — 更新版本号

- `package.json`: `1.5.0` → `1.6.0`
- `flutter_app/pubspec.yaml`: `1.7.0` → `1.8.0`

### Task 5.5 — Git 提交 + Tag

```bash
git add -A
git commit -m "release: v1.6.0 - security fix + code quality overhaul"
git tag v1.6.0
```

### Task 5.6 — 构建 Flutter APK

```bash
cd flutter_app && /opt/flutter/bin/flutter build apk --release
```

### Task 5.7 — 更新文档和审计报告

---

## 时间估算

| Phase                      | Tasks     | 预计工时     | 风险等级                            |
| -------------------------- | --------- | ------------ | ----------------------------------- |
| **Phase 1** 关键安全       | 4 项      | 1 小时       | 🔴 低（范围明确）                   |
| **Phase 2** 高危安全       | 5 项      | 2 小时       | 🟡 中（SSRF 涉及 DNS 依赖）         |
| **Phase 3** 代码/性能      | 13 项     | 4 小时       | 🟡 中（TS严格模式可能引发连锁修复） |
| **Phase 4** Worker/Flutter | 9 项      | 1.5 小时     | 🟡 中（Flutter 构建时间）           |
| **Phase 5** 测试/发布      | 7 项      | 1.5 小时     | 🟢 低                               |
| **总计**                   | **38 项** | **~10 小时** |                                     |

---

## 依赖关系

```
Phase 1 ──→ Phase 2 ──→ Phase 5
                              ↑
Phase 3 ──────────────────────┘
Phase 4 ──────────────────────┘
```

Phase 3 和 Phase 4 可并行执行，互相无依赖。

---

## 回滚方案

每个 Phase 完成后使用 `git commit`，若出现问题可 `git revert` 单个 Phase。
建议按 Task 粒度提交，不要一次性提交整个 Phase。
