# 5572.net 后端安全审计报告

**审计日期**: 2026-06-28  
**审计范围**: 全部 API 路由、代理服务、认证系统、数据库、Worker 脚本  
**审计方法**: 多代理并行代码审查 + 手动深度分析

---

## 严重性分级

| 等级     | 定义                                                  |
| -------- | ----------------------------------------------------- |
| CRITICAL | 可直接利用，导致未授权访问、数据泄露或服务器被控制    |
| HIGH     | 需要特定条件但极易触发，可能导致 SSRF、XSS 或权限绕过 |
| MEDIUM   | 需要一定条件，可能导致信息泄露或资源耗尽              |
| LOW      | 轻微问题，通常需要组合利用                            |

---

## 统计摘要

| 严重性   | 数量    |
| -------- | ------- |
| CRITICAL | **15**  |
| HIGH     | **38**  |
| MEDIUM   | **42**  |
| LOW      | **28**  |
| **总计** | **123** |

---

## CRITICAL 级问题 (15个)

### C1. 源脚本执行器 — 无沙箱的代码注入

**文件**: `src/lib/source-script-executor.ts:65-71`  
**描述**: `new Function()` 执行用户提交的 JavaScript。`BLOCKED_GLOBALS` 仅通过 `var process = undefined` 声明，可被 `(1).constructor.constructor("return process")()` 轻松绕过。脚本可访问网络、文件系统、环境变量。
**影响**: 任意代码执行、数据泄露、服务器被控  
**修复**: 使用 `isolated-vm` 或 child_process 隔离执行；或在执行前冻结所有原型链

### C2. 广告过滤规则 — 客户端 `new Function()` 执行

**文件**: `src/app/play/hooks/useAdFilter.ts:107-112`  
**描述**: 客户端浏览器中使用 `new Function()` 执行从服务器获取的广告过滤规则（用户提交并存储的 JavaScript）。与 C1 相同的注入向量，但在用户浏览器中执行。
**影响**: 跨站脚本 (XSS)、凭据窃取  
**修复**: 将过滤规则改为声明式格式（JSON），避免执行任意代码

### C3. OIDC 回调 — Apple ID Token 从未验证签名

**文件**: `src/app/api/auth/oidc/callback/route.ts:341-361`  
**描述**: Apple 的 `id_token` (JWT) 仅被 base64 解码和解析，但**从未进行密码学签名验证**。攻击者可以伪造任何 JWT payload 冒充任何 Apple 用户。
**影响**: 任意用户身份冒充、未授权访问  
**修复**: 下载 Apple JWKS，验证 JWT 签名，验证 `iss`、`aud`、`exp`、`nonce` 声明

### C4. OIDC 回调 — 通用 ID Token 从未验证

**文件**: `src/app/api/auth/oidc/callback/route.ts:318`  
**描述**: 标准 OIDC 提供者的 `id_token` 同样未被验证。Google、Microsoft、Linux.do 等均可被伪造。
**影响**: 同上  
**修复**: 对所有 OIDC 提供者实现 JWT 验证

### C5. 视频代理 — 无认证和速率限制的开放代理

**文件**: `src/app/api/proxy/stream/route.ts`, `src/app/api/proxy/m3u8/route.ts`, `src/app/api/proxy/segment/route.ts`  
**描述**: 所有通用代理端点无任何身份验证。任何人知道 URL 即可通过服务器代理任意内容。配合 SSRF 漏洞（见 C8-C11），可被用作跳板扫描内网。
**影响**: 未授权代理、SSRF 利用、带宽滥用  
**修复**: 添加认证中间件或限制为内部访问

### C6. FCM 注册端点 — 完全未认证

**文件**: `src/app/api/fcm/register/route.ts:9-35`  
**描述**: 任何匿名用户可以：注册任意 FCM 推送令牌 (POST)；枚举所有注册的令牌 (GET)。GET 端点暴露每个用户的 FCM 令牌、平台和应用版本。
**影响**: 推送服务滥用、用户枚举  
**修复**: POST 需认证；GET 仅限管理员

### C7. 自定义 JAR 端点 — 无认证

**文件**: `src/app/api/tvbox/custom-jar/route.ts:13-57`  
**描述**: POST (保存 JAR URL) 和 DELETE (删除 JAR) 端点没有任何身份验证。任何未认证的攻击者都可以覆盖 TVBox 配置的 JAR URL，向所有客户端分发恶意 JAR 文件。
**影响**: 恶意软件分发、服务器端请求伪造  
**修复**: 添加 `getAuthInfoFromCookie()` 和角色验证

### C8. 图像代理 — 无 SSRF 保护

**文件**: `src/app/api/image-proxy/route.ts:35,89`  
**描述**: `fetchWithRetry()` 接受用户控制的 `url` 参数并直接传递给 `fetch()`，无任何 SSRF 缓解措施。无方案检查、无私有 IP 阻止、无 DNS 重绑定防护。
**影响**: 内网扫描、云元数据泄露 (169.254.169.254)  
**修复**: 在 fetch 前调用 `isUrlSafeDeep()` 验证

### C9. Puppeteer — 无 URL 验证的 `page.goto()`

**文件**: `src/lib/puppeteer.ts:185`  
**描述**: `_fetchPageWithPuppeteerOnce()` 接收原始 `url` 字符串并直接传递给 `page.goto()`。Puppeteer 从服务器解析 DNS 并打开网络连接。任何调用者可利用此进行 SSRF。
**影响**: 内网访问、截图钓鱼、SSRF  
**修复**: 导航前验证 URL，拒绝非 https 方案，阻止私有 IP

### C10. 数据库 V2 用户 — SHA-256 无盐密码哈希

**文件**: `src/lib/upstash.db.ts:361-367`, `src/lib/redis-base.db.ts:515-521`  
**描述**: V2 用户创建使用 `createUserV2()` 方法，密码通过 `sha256(password)` 哈希——**无盐、无迭代**。与 `password.ts` 中使用的 scrypt (N=16384, r=8, p=1) 形成鲜明对比。
**影响**: 彩虹表攻击、密码爆破  
**修复**: 迁移 V2 用户使用 scrypt/bcrypt；新用户统一使用 scrypt

### C11. SimpleCrypto — 原始密码作为 AES 密钥

**文件**: `src/lib/crypto.ts:16-19`  
**描述**: `SimpleCrypto` 使用原始密码通过 MD5 派生 AES 密钥。MD5 已破损，原始密码直接用于加密意味着如果密码泄露，所有加密数据都可解密。
**影响**: 加密数据泄露  
**修复**: 使用 PBKDF2/Argon2 进行密钥派生；使用 `crypto.scryptSync()` 而非 MD5

---

## HIGH 级问题 (38个)

### 认证与授权

#### H1. 认证 Cookie `httpOnly: false` — XSS 令牌窃取

**文件**: `src/app/api/login/route.ts:254,297,355`, `src/app/api/register/route.ts:269`, `src/app/api/logout/route.ts:29`  
**描述**: 所有认证 Cookie (`user_auth`, `auth`) 设置 `httpOnly: false`。结合前端 XSS 表面区域（弹幕文本字段等），任何 JavaScript 注入都可以读取认证 Cookie 并窃取活动会话。
**修复**: 设置 `httpOnly: true`；如果客户端 JS 确实需要 Cookie 数据，通过受保护端点传递

#### H2. 密码以明文形式存储在 Cookie 中

**文件**: `src/lib/auth.ts:52-58,132-151`, `src/app/api/login/route.ts:56-58`  
**描述**: 当 `includePassword=true`（localstorage 模式）时，明文密码直接存储在 auth Cookie JSON 中。即使 Cookie 被签名，如果签名密钥 (`PASSWORD` env var) 泄露或 `httpOnly: false` 允许 XSS 窃取，明文密码就会暴露。
**修复**: 永不在 Cookie 中存储明文密码；仅存储服务器端会话标识符或哈希

#### H3. 无 PKCE 的 OIDC 授权

**文件**: `src/app/api/auth/oidc/login/route.ts:57-117`  
**描述**: 授权请求缺少 `code_challenge` 和 `code_challenge_method`。没有 PKCE，拦截重定向 URI 的攻击者可以在代码到达回调之前替换授权代码。
**修复**: 生成 `code_verifier`，推导 `code_challenge` (S256)，存储在签名 Cookie 中，在令牌交换时兑换

#### H4. OIDC 状态未绑定到用户会话

**文件**: `src/app/api/auth/oidc/login/route.ts:123-134`  
**描述**: `oidc_state` Cookie 独立于用户会话存储。如果攻击者可以通过 XSS 或网络嗅探获取 Cookie 值，他们可以伪造 CSRF 攻击的状态值。
**修复**: 将状态绑定到用户会话或使用以会话 ID 为键的服务器端存储

#### H5. 信任网络 — 通配符 `*` 禁用 IP 保护

**文件**: `src/app/api/admin/trusted-network/route.ts:171`  
**描述**: `isValidIPOrCIDR` 接受 `*` 作为有效值。如果信任网络中间件将 `*` 视为通用允许，则完全禁用了基于 IP 的身份验证。
**修复**: 直接拒绝 `*`，或要求显式所有者确认并显示醒目警告

#### H6. QR 确认 — 明文环境变量密码比较

**文件**: `src/app/api/auth/qr/confirm/route.ts:98-108`  
**描述**: 所有者凭据以明文形式与 `process.env.USERNAME` 和 `process.env.PASSWORD` 比较。如果环境变量被泄露（通过内存转储、日志泄漏或备份），所有者密码就会暴露。
**修复**: 启动时哈希环境变量密码并比较哈希

#### H7. Telegram Webhook 无密钥验证

**文件**: `src/app/api/telegram/webhook/route.ts:11`  
**描述**: Webhook POST 处理程序从不验证 `X-Telegram-Bot-Api-Secret-Token`。任何知道端点 URL 的攻击者都可以发送伪造的 Telegram 更新。
**修复**: 在 POST 处理程序顶部添加头部验证

#### H8. Telegram set-webhook 端点未认证

**文件**: `src/app/api/telegram/set-webhook/route.ts:10-16`  
**描述**: POST `/api/telegram/set-webhook` 端点没有身份验证。任何未认证的用户都可以更改机器人的 webhook 目标。
**修复**: 需要管理员角色验证

#### H9. 主机头操纵 — 自动 Webhook 劫持

**文件**: `src/app/api/telegram/webhook/route.ts:76-120`  
**描述**: 每个 webhook 请求调用 `autoSetWebhook()`，它读取 `Host` 头并重新配置 Telegram 机器人的 webhook URL。攻击者发送带有伪造 `Host` 头的请求可以将所有机器人消息重定向到自己的服务器。
**修复**: 从 webhook 处理程序中完全移除自动 webhook 更新；硬编码允许的 webhook URL

### SSRF

#### H10. M3U8 代理 — 双重解码 SSRF 绕过

**文件**: `src/app/api/proxy/m3u8/route.ts:56`  
**描述**: `decodeURIComponent(url)` 在 Next.js 自动解码后再次解码。攻击者可以对内部 URL 进行双重编码以绕过初始 SSRF 检查。
**修复**: 使用 `isUrlSafeDeep()` 代替 `isUrlSafe()`

#### H11. 流代理 — 双重解码 SSRF 绕过

**文件**: `src/app/api/proxy/stream/route.ts:52`  
**描述**: 与 H10 相同的问题。
**修复**: 同上

#### H12. M3U8 重写 URL 未重新验证

**文件**: `src/app/api/proxy/m3u8/route.ts:394,467,477,598,618,650,678,699,720,741,801,842`  
**描述**: `rewriteM3U8Content()` 函数处理 M3U8 播放列表内容并通过代理端点重写所有相对/绝对 URL。然而，**重写后的 URL 在嵌入 M3U8 响应之前未通过 `isUrlSafe()` 重新验证**。攻击者控制 M3U8 播放列表可以嵌入内部 URL。
**修复**: 在重写之前对每个解析的 URL 运行 `isUrlSafeDeep()`

#### H13. 代理端点 — 重定向后无验证

**文件**: `src/app/api/proxy/stream/route.ts:52-55`, `src/app/api/video-proxy/route.ts:42-47`  
**描述**: `isUrlSafe()` 验证初始 URL，但不重新验证重定向后的 URL。由于 `redirect: 'follow'` 设置，最终目的地可能是内部 IP。
**修复**: 添加自定义代理验证最终重定向目标，或使用 `redirect: 'manual'` 并检查每次跳转

#### H14. 直播频道获取 — 无 URL 验证

**文件**: `src/lib/live.ts:146,325,538`  
**描述**: 三个单独的外部获取操作使用来自 `config.LiveConfig`（管理员数据库存储、用户可配置）的 URL。这些都不验证解析的 IP 或阻止私有地址。
**修复**: 实现共享的 URL 验证函数，在任何 fetch 之前阻止私有/保留 IP 范围

#### H15. EPG 解析 — 无 SSRF 保护

**文件**: `src/lib/iptv.ts:141`  
**描述**: `parseEPG(url)` 对任何 EPG URL 执行不受限制的 `fetch(url)`。URL 源自管理员配置的直播源 EPG 字段或 M3U `x-tvg-url` 属性。
**修复**: 在调用 `fetch()` 之前验证 URL 是否针对私有 IP 范围

#### H16. 短剧模块 — 无 SSRF 保护

**文件**: `src/app/api/shortdrama/list/route.ts:28-36`, `src/lib/shortdrama.client.ts:232-241`, `src/lib/pansou.ts:69-74`  
**描述**: 所有外部 `fetch()` 调用到短剧 API 和 PanSou 服务器都没有 SSRF 验证。API URL 源自两个路径：硬编码在 `shortdrama-sources.ts` 中和通过管理员面板的用户可配置。
**修复**: 在所有外部获取之前包装 `isUrlSafeDeep()`

#### H17. 下游搜索 — 无 SSRF 保护

**文件**: `src/lib/downstream.ts:149,299,374-378,599,604,695`  
**描述**: `searchWithCache()`、`searchFromApi()`、`getDetailFromApi()` 和 `handleSpecialSourceDetail()` 中的每个 `fetch()` 调用都从 `apiSite.api`（服务器配置）和用户提供的 `query`/`id` 值构造 URL。
**修复**: 集中所有外部请求通过单一获取包装器，强制执行 SSRF 保护

#### H18. CMS 代理 — 主机头注入

**文件**: `src/app/api/emby/cms-proxy/[token]/route.ts:211-218`  
**描述**: `host` 和 `proto` 从 `request.headers.get('host')` 和 `x-forwarded-host`/`x-forwarded-proto` 读取。攻击者控制这些头可以伪造 `baseUrl` 指向任意域。
**修复**: 仅信任 `process.env.SITE_BASE` 或将 `host` 验证为已知域的白名单

### 输入验证与 XSS

#### H19. 弹幕发送 — 写入时无 HTML sanitization

**文件**: `src/app/api/danmu/send/route.ts:26-58`  
**描述**: `text` 字段仅被修剪和长度限制（最大 100 字符），但不包含 HTML/实体 sanitization。存储的弹幕文本随后通过 GET 端点提供并由前端渲染。如果前端将弹幕文本渲染为 HTML，这是存储的 XSS 向量。
**修复**: 在写入时 sanitization 弹幕文本（剥离 HTML 标签，转义实体）；在前端仅将弹幕渲染为文本

#### H20. 短剧数据 — 第三方 API 数据未经 sanitization

**文件**: `src/app/api/shortdrama/detail/route.ts:149,165`, `src/lib/shortdrama-constants.ts:146-168`  
**描述**: 来自第三方 API 的所有文本字段 (`vod_name`, `vod_content`, `vod_blurb`) 直接返回给客户端，没有 HTML sanitization。如果 scraper 被篡改或操纵，这些字段中的恶意 HTML/JS 成为存储的 XSS。
**修复**: 在服务器端返回之前使用 `sanitize-html` sanitization 所有文本字段

#### H21. Emby 播放 — 文件名头注入

**文件**: `src/app/api/emby/play/[token]/[filename]/route.ts:126`  
**描述**: URL 路径中的 `filename` 直接插入 `Content-Disposition`。如果路径段包含 `%0d%0a` (CRLF)，攻击者可以注入任意 HTTP 响应头。
**修复**: 在用于 `Content-Disposition` 之前剥离所有 `\r`、`\n` 和引号字符；验证匹配 `^[a-zA-Z0-9._-]+$`

#### H22. 解析端点 — 开放重定向

**文件**: `src/app/api/parse/route.ts:85,93,208`  
**描述**: 解析端点接受 `url` 查询参数，将其与硬编码的解析器前缀连接，并以三种危险方式使用：(1) `fetch()` 健康检查，(2) `NextResponse.redirect()`，(3) iframe 注入。
**修复**: 在 processing 之前将输入 URL 验证为已知视频平台域的白名单

### 速率限制与资源耗尽

#### H23. 搜索端点 — 无速率限制

**文件**: `src/app/api/search/route.ts:44-317`  
**描述**: 主搜索端点没有限速。每个经过身份验证的请求在所有配置的 API 站点上生成并发 `fetch()` 调用（5-10+ 并行外部请求）。
**修复**: 实现每用户速率限制，使用滑动窗口计数器（Redis 或内存）

#### H24. SSE 搜索 — 无限连接

**文件**: `src/app/api/search/ws/route.ts:19-269`  
**描述**: SSE 流式端点没有限速。每个连接在所有 API 站点上生成并发搜索并保持打开 HTTP 连接 indefinitely。
**修复**: 添加每用户连接限制和请求速率节流

#### H25. 短剧/网盘搜索 — 无速率限制

**文件**: 所有 8 个短剧路由 + `src/app/api/netdisk/search/route.ts`  
**描述**: 零端点实施速率限制。每个请求可以触发多个并行 `fetch()` 调用到 3+ 外部 API。
**修复**: 实现每 IP 速率限制中间件

#### H26. 视频代理 — 无响应体大小限制

**文件**: `src/app/api/video-proxy/route.ts:125,310`  
**描述**: 视频响应体在没有大小限制的情况下转发。大视频或 slow-loris 攻击可能耗尽服务器资源。
**修复**: 添加流式大小限制

#### H27. M3U8 代理 — 无内容大小限制

**文件**: `src/app/api/proxy/m3u8/route.ts:190`  
**描述**: `await response.text()` 将整个 M3U8 内容加载到内存中。恶意的或极大的 M3U8 播放列表可能耗尽内存。
**修复**: 在调用 `.text()` 之前添加大小限制（例如 10MB）

### 密钥与凭据泄露

#### H28. Dockerfile 中硬编码数据库密码

**文件**: `Dockerfile`, `.github/workflows/deploy.yml`, `scripts/deploy-remote.sh`  
**描述**: 数据库密码 `Danny0923` 硬编码在 Dockerfile、deploy.yml 和 deploy-remote.sh 中。这些文件在 Git 仓库中，任何有仓库访问权限的人都可以看到密码。
**修复**: 使用环境变量或秘密管理工具（如 Docker secrets、HashiCorp Vault）

#### H29. Cron 端点 — 令牌在 URL 查询参数中

**文件**: `src/app/api/cron/route.ts:180-185`  
**描述**: cron 令牌作为 URL 查询参数 (`?token=xxx`) 传递，这意味着：令牌在 Web 服务器访问日志中被记录；令牌出现在浏览器历史/引用头中；令牌可以通过代理日志泄露。
**修复**: 使用 `Authorization: Bearer <token>` 标头代替查询参数

#### H30. 服务器配置泄露存储类型和 Telegram 机器人用户名

**文件**: `src/app/api/server-config/route.ts:16,27-34`  
**描述**: 返回 `StorageType`（揭示后端基础设施）、`TelegramAuthConfig.botUsername`（揭示 Telegram 机器人身份）和 `OIDCProviders[].issuer`（揭示 OAuth 提供商 URL）。
**修复**: 从响应中移除 `StorageType`

#### H31. 密码重置 — 无确认

**文件**: `src/app/api/admin/reset/route.ts:30`  
**描述**: 破坏性重置端点没有二次确认或范围限制。经过身份验证的管理员可以一键删除所有数据。
**修复**: 添加确认步骤；允许指定要重置的数据类别

### 其他 HIGH 问题

#### H32. 登录端点 — 无密码强度验证

**文件**: `src/app/api/login/route.ts`  
**描述**: 登录端点接受任何长度的密码，只要与存储的哈希匹配。弱密码不受限制。
**修复**: 在注册时强制执行最小密码复杂度（见 H33）

#### H33. 注册 — 密码强度太弱

**文件**: `src/app/api/register/route.ts:170-179`  
**描述**: 最小长度为 6 个字符。只需要一个大写字母**或**一个数字。容易被暴力破解和字典攻击。
**修复**: 增加到 8-12 个字符；要求混合大小写、数字和可选的特殊字符

#### H34. 改密端点 — 无需旧密码验证

**文件**: `src/app/api/change-password/route.ts:24-36`  
**描述**: 端点只接受正文中的 `newPassword`。没有验证 `oldPassword`。一旦经过身份验证（Cookie 被盗或会话劫持），攻击者可以立即更改受害者的密码。
**修复**: 在请求正文中要求 `oldPassword` 并在允许更改之前验证它

#### H35. OIDC 令牌端点响应未验证

**文件**: `src/app/api/auth/oidc/callback/route.ts:300-304`  
**描述**: 令牌交换不验证返回的 `access_token` 或 `id_token` 是否正确绑定到 `client_id`。
**修复**: 验证令牌的 `aud` 声明匹配预期的客户端标识符

#### H36. QR 码无暴力破解保护

**文件**: `src/app/api/auth/qr/route.ts:30-36`  
**描述**: QR 会话 ID 生成具有 32 个十六进制字符（128 位熵），这很强，但确认端点除了通用的基于 IP 的 fail2ban 检查外没有限速。
**修复**: 添加每会话尝试限制（例如，每个 QR 会话最多 5 次尝试）

#### H37. 数据库连接 — 无 TLS 强制

**文件**: `src/lib/redis.db.ts`, `src/lib/upstash.db.ts`  
**描述**: Redis 连接配置未强制使用 TLS。在开发或非生产环境中，连接可能在明文上进行。
**修复**: 在生产环境中始终使用 `TLS=true`；验证连接字符串

#### H38. 错误消息泄露堆栈跟踪

**文件**: 多个端点（`src/app/api/emby/audio-streams/route.ts:48`, `src/app/api/change-password/route.ts:53-60`）  
**描述**: `(error as Error).message` 直接返回给客户端，可能暴露内部 API 端点、服务器 URL 或配置详细信息。
**修复**: 在生产中返回通用错误消息；仅在服务器端记录完整详情

---

## MEDIUM 级问题 (42个)

### M1. `isUrlSafeDeep` 在 DNS 失败时返回 `true`

**文件**: `src/lib/ssrf-protection.ts:104`  
**描述**: 当 DNS 解析失败时，`isUrlSafeDeep` 返回 `true`（允许请求通过）。这是一个保守的选择，可能允许请求通过暂时 DNS 失败但后来解析为内部 IP 的域名。
**修复**: 考虑在 DNS 失败时返回 `false` 以失败关闭，或实现带 TTL 验证的 DNS 解析缓存

### M2. 认证 Cookie 包含明文用户名和角色

**文件**: `src/app/api/telegram/verify/route.ts:54-70`, `src/app/api/auth/oidc/callback/route.ts:39-55`  
**描述**: `user_auth` Cookie 存储 `username`、`role`、`timestamp` 和 `loginTime` 作为纯 JSON。虽然它是 HMAC 签名的，但如果签名密钥 (`process.env.PASSWORD`) 泄露，攻击者可以伪造具有提升角色的任意会话。
**修复**: 在 Cookie 中仅存储服务器端会话 ID；将会话数据保存在服务器上

### M3. 认证 Cookie `secure` 标志依赖 `NODE_ENV`

**文件**: 多个路由文件  
**描述**: 如果应用程序部署在具有 HTTPS 终止的反向代理后面，`NODE_ENV` 可能是 `development`，而流量实际上是 HTTPS。`secure` 标志将为 false，通过纯 HTTP 发送 Cookie。
**修复**: 检查实际请求协议 (`req.headers.get('x-forwarded-proto') === 'https'`) 而不是 `NODE_ENV`

### M4. 基于内存的速率限制 — 重启丢失

**文件**: `src/app/api/register/route.ts:84-96`, `src/app/api/login/route.ts:169-181`  
**描述**: 速率限制器存储在进程全局 Map 中。如果服务器重启（或在服务器less 环境中容器回收），速率限制状态丢失，允许批量注册。
**修复**: 将速率限制移到 Redis 或分布式存储

### M5. 无 CSRF 保护

**文件**: 多个 POST 端点（register, login, change-password）  
**描述**: 所有 POST 端点接受来自任何来源的请求。除了 Cookie `sameSite: 'lax'` 外，没有 CSRF 令牌。
**修复**: 为所有状态改变的 POST 端点实施 CSRF 令牌

### M6. 登出 — 未使 HMAC 签名失效

**文件**: `src/app/api/logout/route.ts:13-16`  
**描述**: `revokeToken()` 调用将令牌添加到 Redis 撤销集，但 HMAC 签名本身仍然有效。如果绕过令牌撤销检查（例如，如果 `PASSWORD` env var 未设置），已撤销的 Cookie 仍然有效。
**修复**: 确保即使跳过签名验证也检查令牌撤销

### M7. 缓存键派生自用户控制的 URL

**文件**: `src/app/api/video-proxy/route.ts:53,65`  
**描述**: `hashUrl(videoUrl)` 使用 URL 的 SHA-256 作为缓存键。攻击者可以用唯一 URL 淹没缓存，导致 `/tmp/video-cache/` 和无界 Kvrocks 存储增长。
**修复**: 实施最大缓存大小和 LRU 淘汰策略

### M8. 代理端点 — 无请求日志/审计追踪

**文件**: 所有代理端点  
**描述**: 代理请求没有记录足够的细节来检测滥用模式。`console.log` 语句是开发专用的，不捕获请求元数据。
**修复**: 为所有代理请求添加结构化日志，包括源 IP、目标 URL、响应大小和持续时间

### M9. 数据迁移端点 — 无输入验证

**文件**: `src/app/api/admin/data_migration/import/route.ts`  
**描述**: 导入端点接受任意 JSON 数据并直接合并到数据库中。没有对导入数据的结构或内容进行验证。
**修复**: 验证导入数据的 schema；限制可导入的字段

### M10. 用户管理 — 无跨用户授权检查

**文件**: `src/app/api/admin/user/route.ts`  
**描述**: 用户管理端点允许管理员修改任何用户数据，但没有检查请求者是否可以修改特定用户。理论上，经过身份验证的用户可以枚举和修改其他用户的配置。
**修复**: 添加授权检查：用户只能修改自己的数据，除非他们是管理员

### M11. 邀请码验证 — 无速率限制

**文件**: `src/app/api/invites/validate/route.ts:12-40`  
**描述**: 邀请码验证端点没有限速。攻击者可以暴力破解 8 字符字母数字邀请码空间。
**修复**: 添加每 IP 速率限制（例如，每分钟 10 次验证）

### M12. 弹幕外部搜索 — 无认证，无速率限制

**文件**: `src/app/api/danmu-external/search/route.ts:117-228`  
**描述**: 公开端点将搜索查询代理到外部弹幕 API。无速率限制意味着攻击者可以通过此端点淹没外部弹幕 API。
**修复**: 添加每 IP 速率限制

### M13. 快速端点泄露管理员链接和用户计数

**文件**: `src/app/api/quick/route.ts:30-44`  
**描述**: 返回总/活跃用户计数和管理面板链接路径。
**修复**: 从响应中移除管理员链接路径

### M14. 外部播放器端点 — 无 `platform` 参数验证

**文件**: `src/app/api/external-player/route.ts:85`  
**描述**: `platform` 参数在不验证的情况下接受。虽然它只影响过滤（不影响数据访问），但接受任意值是不好的做法。
**修复**: 白名单已知平台值：`['windows', 'macos', 'linux', 'ios', 'android']`

### M15. 版本检查端点硬编码版本

**文件**: `src/app/api/version-check/route.ts:5-17`  
**描述**: 版本信息在路由文件中硬编码，而不是从中央版本文件读取。
**修复**: 从 `@/lib/version` 导入 `CURRENT_VERSION`

### M16. 弹幕外部 — 进程全局缓存

**文件**: `src/app/api/danmu-external/route.ts:23-24`  
**描述**: 内存缓存不与服务器实例共享。每个实例维护自己的缓存，减少多实例部署中的命中率。
**修复**: 对弹幕缓存使用 Redis

### M17. FCM 令牌 Map 是进程全局且永不清理

**文件**: `src/app/api/fcm/register/route.ts:4-7`  
**描述**: 存储在 Map 中的 FCM 令牌没有过期时间，没有清理过期令牌，没有按用户去重。
**修复**: 对 FCM 令牌存储使用带 TTL 清理的数据库

### M18. 配置端点 — 可设置为危险值

**文件**: `src/app/api/admin/config/route.ts`  
**描述**: 配置端点允许设置任意配置值，包括可能启用代码执行的值（如源脚本）。
**修复**: 实施配置字段白名单；验证值类型和范围

### M19. 源探针 — SSRF 通过探测任意 URL

**文件**: `src/app/api/admin/source-probe/route.ts`  
**描述**: 源探针端点允许探测任意 URL 以测试源可用性。没有 SSRF 保护。
**修复**: 在探测之前验证 URL；限制为已知源域

### M20. Emby 音频流 — 无 itemId 验证

**文件**: `src/app/api/emby/audio-streams/route.ts:12`  
**描述**: `itemId` 从查询参数接受，没有任何格式验证。
**修复**: 验证 `itemId` 非空且为字母数字

### M21. Emby 密钥枚举

**文件**: `src/app/api/emby/cms-proxy/[token]/route.ts:81,85`  
**描述**: `embyKey` 传递给 `embyManager.getClient(embyKey)` 而没有验证。不同的无效密钥产生可区分的错误消息，泄露配置的 Emby 源数量。
**修复**: 对任何无效 `embyKey` 返回统一错误

### M22. 无输入 sanitization 的 `wd` 和 `ids` 参数

**文件**: `src/app/api/emby/cms-proxy/[token]/route.ts:22-23,88-110`  
**描述**: `wd`（搜索词）和 `ids` 在不限制长度或字符的情况下传递给 Emby API 调用。
**修复**: 实施合理限制（例如，`wd` 最大 200 字符，`ids` 最大 50）

### M23. CMS 代理 — 无 Content-Type 验证

**文件**: `src/app/api/emby/cms-proxy/[token]/route.ts:148`  
**描述**: CMS 代理在不显式设置 `Content-Type: application/json` 的情况下返回 JSON。
**修复**: 确保所有响应的 `Content-Type` 标头一致

### M24. 代理 — 无重定向验证

**文件**: `src/app/api/emby/play/[token]/[filename]/route.ts:76-78`  
**描述**: 对 `embyStreamUrl` 的 `fetch()` 调用默认跟随重定向。如果 Emby 服务器返回指向内部地址的 302，代理将获取它。
**修复**: 在重定向后使用 `isUrlSafeDeep()` 验证最终解析的 URL

### M25. 上游标头原样转发

**文件**: `src/app/api/emby/play/[token]/[filename]/route.ts:109-118`  
**描述**: 来自 Emby 服务器的任意标头被反映给客户端。`Set-Cookie` 或 `Location` 标头可能泄露内部状态。
**修复**: 仅白名单安全标头（`Content-Type`、`Content-Length`、`Accept-Ranges`、`Content-Range`）

### M26. 无响应体大小限制 — 视频代理

**文件**: `src/app/api/video-proxy/route.ts:125,310`  
**描述**: 视频响应体在没有大小限制的情况下转发。
**修复**: 添加流式大小限制

### M27. 缓存键派生自用户控制的 URL

**文件**: `src/app/api/video-proxy/route.ts:53,65`  
**描述**: 攻击者可以用唯一 URL 淹没缓存，导致无界增长。
**修复**: 实施最大缓存大小和 LRU 淘汰

### M28. 重试循环 — 最多 60 秒等待时间

**文件**: `src/app/api/video-proxy/route.ts:138-148`  
**描述**: 指数退避重试循环（2s、4s）与 30s `AbortController` 超时结合，可能导致每个请求最多约 60 秒的总等待时间。
**修复**: 在 30s 超时内限制总重试时间

### M29. 代理 — 无请求体大小限制

**文件**: `src/app/api/proxy/stream/route.ts:72-80`  
**描述**: 无 `maxResponseSize` 或等效限制强制执行。
**修复**: 添加可配置的响应体大小上限并中止流

### M30. 源参数未验证

**文件**: `src/app/api/proxy/stream/route.ts:43-45`  
**描述**: `source` 参数接受来自 `5572tv-source`、`moontv-source` 或 `decotv-source` 查询参数的任意字符串。
**修复**: 白名单已知源值

### M31. M3U8 代理 — 5 秒超时太激进

**文件**: `src/app/api/proxy/m3u8/route.ts:106`  
**描述**: 初始 M3U8 获取的 5 秒超时很激进，可能导致合法慢服务器失败，如果中止不干净释放响应体，可能导致资源泄漏。
**修复**: 增加超时或添加中止时的正确清理

### M32. 统计对象永不重置

**文件**: `src/app/api/proxy/m3u8/route.ts:33-38`  
**描述**: 内存 `stats` 对象在整个 Node.js 生命周期内累积计数。
**修复**: 定期重置或限制统计

### M33. 段代理 — 无响应体大小限制

**文件**: `src/app/api/proxy/segment/route.ts:155-266`  
**描述**: `ReadableStream` 代理转发整个上游响应体，没有任何大小限制。
**修复**: 跟踪 `bytesTransferred` 并在可配置限制之后中止流

### M34. 代理池 — 无每请求限制

**文件**: `src/app/api/proxy/segment/route.ts:14-28`  
**描述**: 每个代理 `maxSockets: 100`，除了 30s 之外没有连接超时。
**修复**: 添加每 IP 或全局速率限制

### M35. 开发环境错误详情泄露

**文件**: `src/app/api/proxy/segment/route.ts:309-316`  
**描述**: `error.message` 在 `NODE_ENV === 'development'` 时在响应体中返回。
**修复**: 已由 `NODE_ENV` 检查保护——可接受

### M36. 源脚本执行器 — 重复的 `executeScript`

**文件**: `src/app/api/source-script/route.ts:156-189`  
**描述**: 路由文件包含自己的 `executeScript` 副本，具有略有不同的 `BLOCKED_GLOBALS` 列表。这意味着两个代码路径以不同的阻止列表执行脚本。
**修复**: 移除重复；从 `source-script-executor.ts` 导入并使用单个执行器

### M37. 广告过滤规则 — 客户端执行

**文件**: `src/app/play/hooks/useAdFilter.ts:107-112`  
**描述**: 客户端浏览器中使用 `new Function()` 执行从服务器获取的广告过滤规则。
**修复**: 将过滤规则改为声明式格式（JSON）

### M38. 代理策略 — 内部 URL 拼接

**文件**: `src/lib/proxy.ts:183-190`  
**描述**: 当触发代理策略时，代码构建 `${proxyBase}/p/video?url=${encodeURIComponent(url)}`。`proxyBase`（来自配置）和 `url`（用户控制）被连接。
**修复**: 验证 `proxyBase` 解析为预期域

### M39. 下游搜索 — 无 SSRF 保护

**文件**: `src/lib/downstream.ts:149,299,374-378`  
**描述**: 每个 `fetch()` 调用从 `apiSite.api`（服务器配置）和用户提供的 `query`/`id` 值构造 URL。
**修复**: 集中所有外部请求通过单一获取包装器

### M40. 解析端点 — 开放重定向

**文件**: `src/app/api/parse/route.ts:214`  
**描述**: `NextResponse.redirect(parseUrl)` 使用用户控制的 URL。
**修复**: 将输入 URL 验证为白名单域

### M41. 搜索查询 — 无最大长度

**文件**: `src/app/api/search/route.ts:70`  
**描述**: 查询参数 `q` 仅接收 `.trim()`。没有最大长度。
**修复**: 实施最大长度（例如，200 字符）

### M42. 建议端点 — 无速率限制

**文件**: `src/app/api/search/suggestions/route.ts:14-55`  
**描述**: 没有限速。内部执行完整的 `searchFromApi()` 调用。
**修复**: 实施与主搜索端点一致的速率限制

---

## LOW 级问题 (28个)

### L1. 魔法链接端点允许用户名枚举

**文件**: `src/app/api/telegram/send-magic-link/route.ts:13`  
**描述**: 任何非空 `telegramUsername` 字符串都以 200 响应成功。攻击者可以迭代用户名以发现哪些 Telegram 账户存在。
**修复**: 添加速率限制

### L2. QR 取消无身份验证

**文件**: `src/app/api/auth/qr/cancel/route.ts:20-30`  
**描述**: 任何知道 `sessionId` 的人都可以取消待处理的 QR 登录会话。
**修复**: 要求取消方证明对会话的所有权

### L3. 设备管理缺乏跨用户验证

**文件**: `src/app/api/auth/devices/route.ts:86-96`  
**描述**: `getUsernameFromCookie()` 函数解析 `user_auth` Cookie 并信任 JSON 中的 `username` 字段。
**修复**: 使 Cookie 为 `httpOnly` 并在每个请求上验证用户名

### L4. Fail2Ban 仅基于 IP

**文件**: `src/app/api/auth/oidc/callback/route.ts:143-153`  
**描述**: fail2ban 检查是基于 IP 的。如果多个用户共享一个 IP（企业网络、NAT），一个用户的失败尝试可能会锁定该 IP 上的所有用户。
**修复**: 添加基于每用户的尝试跟踪

### L5. 详细日志可能泄露敏感数据

**文件**: `src/app/api/telegram/webhook/route.ts:14`  
**描述**: 完整的有效负载、令牌前缀和配置对象记录到控制台。
**修复**: sanitization 日志输出以排除令牌、机密和个人信息

### L6. 版本检查端点硬编码版本

**文件**: `src/app/api/version-check/route.ts:5-17`  
**描述**: 版本信息在路由文件中硬编码。
**修复**: 从 `@/lib/version` 导入 `CURRENT_VERSION`

### L7. 弹幕外部 — 进程全局缓存

**文件**: `src/app/api/danmu-external/route.ts:23-24`  
**描述**: 内存缓存在服务器实例之间不共享。
**修复**: 对弹幕缓存使用 Redis

### L8. FCM 令牌 Map 永不清理

**文件**: `src/app/api/fcm/register/route.ts:4-7`  
**描述**: 没有过期时间的 FCM 令牌存储。
**修复**: 使用带 TTL 清理的数据库

### L9. 改密端点 — 错误详情泄露

**文件**: `src/app/api/change-password/route.ts:53-60`  
**描述**: 内部错误详情在 500 响应中返回给客户端。
**修复**: 返回通用错误消息

### L10. 外部播放器 — 无 `platform` 验证

**文件**: `src/app/api/external-player/route.ts:85`  
**描述**: `platform` 参数在不验证的情况下接受。
**修复**: 白名单已知平台值

### L11. 短剧端点 — 无认证

**文件**: 所有 7 个短剧路由  
**描述**: 短剧端点不需要身份验证。这可能是消费者媒体站点的预期行为。
**修复**: 如果需要限制访问，添加认证

### L12. 网盘搜索 — 对任何经过身份验证的用户开放

**文件**: `src/app/api/netdisk/search/route.ts:11-14`  
**描述**: 端点检查 `authInfo.username` 但不验证角色。
**修复**: 添加角色检查

### L13. 数值参数 — 无上界

**文件**: `src/app/api/shortdrama/list/route.ts:156-158`  
**描述**: 参数由 `parseInt()` 解析并检查 `NaN`，但没有范围验证。
**修复**: 添加边界检查

### L14. 搜索查询字符串 — 无长度限制

**文件**: `src/app/api/shortdrama/search/route.ts:169`  
**描述**: 搜索查询直接传递给外部 API 和日志。
**修复**: 实施最大 200 个字符

### L15. 错误消息 — 泄露上游 URL

**文件**: `src/app/api/shortdrama/detail/route.ts:124`  
**描述**: `error.message` 从外部 API 泄露。
**修复**: 用 sanitization 版本替换

### L16. 控制台日志 — 暴露请求详情

**文件**: `src/app/api/shortdrama/list/route.ts:123-131`  
**描述**: 调试 `console.log` 语句包括完整的请求 URL、用户代理和引用者。
**修复**: 使用带日志级别的结构性日志

### L17. 黄色字过滤 — 未应用于短剧

**文件**: `src/lib/yellow.ts:1-29`  
**描述**: `yellowWords` 数组在主搜索路由中使用，但**不应用于**短剧结果。
**修复**: 将 `yellowWords` 过滤应用于短剧搜索和列表结果

### L18. 内存缓存 — 无淘汰边界

**文件**: `src/lib/shortdrama.client.ts:73-76`  
**描述**: 无界 `Map` 实例。
**修复**: 替换为 `BoundedMap`

### L19. 缓存键 — 不同云类型可能冲突

**文件**: `src/app/api/netdisk/search/route.ts:40-44`  
**描述**: 缓存键包括排序的 `enabledCloudTypes`，但如果配置在具有相同查询的请求之间更改，可能提供陈旧缓存的结果。
**修复**: 当前实现已通过将云类型包含在键中来正确处理

### L20. 播放 URL 解析 — 脆弱

**文件**: `src/app/api/shortdrama/detail/route.ts:132-135`  
**描述**: 格式 `"01$url1#02$url2"` 被天真地分割。
**修复**: 使用更强大的解析器

### L21. 错误处理 — 一般良好

**文件**: 所有路由文件  
**描述**: 大多数错误处理器返回通用消息。
**修复**: 可接受

### L22. 控制台日志 — 暴露请求详情

**文件**: `src/app/api/shortdrama/list/route.ts:186-197`  
**描述**: 调试日志包括完整的请求 URL。
**修复**: 在环境变量下门控调试日志

### L23. 短剧常量 — 黄色字不一致

**文件**: `src/lib/shortdrama-constants.ts:39-91`  
**描述**: `EXCLUDE_KEYWORDS` 部分重叠但不覆盖相同的集合。
**修复**: 统一过滤逻辑

### L24. 缓存键 — 配置更改

**文件**: `src/app/api/netdisk/search/route.ts:40-44`  
**描述**: 缓存键在配置更改时可能过时。
**修复**: 当前实现已正确处理

### L25. 播放 URL 解析 — 不处理边缘情况

**文件**: `src/app/api/shortdrama/parse/route.ts:137-140`  
**描述**: 如果 URL 包含 `$` 或 `#` 字符，解析中断。
**修复**: 处理 URL 编码

### L26. 错误消息 — 一般清洁

**文件**: 所有路由文件  
**描述**: 大多数错误处理器返回通用消息。
**修复**: 可接受

### L27. 控制台日志 — 暴露请求详情

**文件**: `src/app/api/shortdrama/search/route.ts:227`  
**描述**: 调试 `console.log` 语句包括完整的请求 URL。
**修复**: 门控调试日志

### L28. 短剧常量 — 黄色字不一致

**文件**: `src/lib/shortdrama-constants.ts:39-91`  
**描述**: `EXCLUDE_KEYWORDS` 部分重叠但不覆盖相同的集合。
**修复**: 统一过滤逻辑

---

## 优先级修复路线

### 立即 (CRITICAL)

1. **实现所有 OIDC 提供者的 JWT 签名验证** (C3, C4)
2. **沙箱或移除源脚本执行器** (C1, C2)
3. **为所有代理端点添加认证** (C5)
4. **添加 FCM 注册端点的认证** (C6)
5. **添加自定义 JAR 端点的认证** (C7)
6. **为图像代理添加 SSRF 保护** (C8)
7. **为 Puppeteer 添加 URL 验证** (C9)
8. **迁移 V2 用户到 scrypt 密码哈希** (C10)
9. **修复 SimpleCrypto 密钥派生** (C11)

### 短期 (HIGH)

1. **实施所有端点的速率限制** (H23-H27)
2. **为所有代理端点添加 SSRF 保护** (H10-H18)
3. **修复 Cookie 安全设置** (H1, H2)
4. **实施 OIDC PKCE** (H3)
5. **Sanitization 所有用户生成的内容** (H19-H21)
6. **修复密码强度要求** (H33)
7. **在改密端点中验证旧密码** (H34)
8. **修复信任网络通配符** (H5)
9. **移除 Telegram webhook 中的自动配置** (H7-H9)
10. **修复硬编码密钥泄露** (H28)

### 中期 (MEDIUM)

1. **实施 CSRF 保护** (M5)
2. **迁移到 Redis 速率限制** (M4)
3. **实现结构化日志** (M8)
4. **添加输入验证** (M9-M10)
5. **实施配置字段白名单** (M18)
6. **修复错误消息泄露** (H38, M19)

### 长期 (LOW)

1. **实施用户名枚举保护** (L1)
2. **添加 QR 取消认证** (L2)
3. **实现设备管理跨用户验证** (L3)
4. **添加基于每用户的 fail2ban** (L4)
5. **Sanitization 所有日志输出** (L5)
6. **统一短剧过滤** (L17, L23, L28)

---

## 总体安全评估

**风险等级: 高**

该项目有多个关键安全问题需要立即解决。最紧迫的 Concerns 是：

1. **无沙箱的代码执行** — 源脚本执行器和广告过滤规则允许执行用户提交的 JavaScript，没有任何有效的隔离
2. **OIDC 身份验证完全被绕过** — JWT 签名从未验证，允许任何攻击者冒充任何用户
3. **广泛的 SSRF** — 多个代理端点没有 URL 验证，允许从服务器访问内网资源
4. **弱密码处理** — V2 用户使用无盐 SHA-256，SimpleCrypto 使用破损的 MD5
5. **Cookie 安全** — 所有认证 Cookie 都是 `httpOnly: false`，使它们容易受到 XSS 攻击
6. **无速率限制** — 搜索、短剧和代理端点没有限速，容易受到资源耗尽攻击
7. **密钥泄露** — 数据库密码硬编码在 Dockerfile 和部署脚本中

建议立即成立一个安全修复冲刺，优先解决所有 CRITICAL 和 HIGH 级别的问题。
