# Cloudflare 配置快照

> 最后更新: 2026-05-24 | Zone ID: `5279c5dfbbffc8e96c1dc45b21c23b03`

## DNS 记录

| 域名                | 类型  | 目标               | 代理       |
| ------------------- | ----- | ------------------ | ---------- |
| `5572.net`          | A     | 89.144.35.42       | ✅ proxied |
| `5572.net`          | AAAA  | 2a14:7584:d051::a  | ✅ proxied |
| `*.5572.net`        | A     | 89.144.35.42       | ✅ proxied |
| `*.5572.net`        | AAAA  | 2a14:7584:d051::a  | ✅ proxied |
| `www.5572.net`      | CNAME | cdn-all.988928.xyz | ❌ 非代理  |
| `guanying.5572.net` | A     | 89.144.35.42       | ✅ proxied |
| `origin.5572.net`   | A     | 89.144.35.42       | ✅ proxied |
| `api.5572.net`      | AAAA  | 100::              | ✅ proxied |
| `mail.5572.net`     | CNAME | us1.workspace.org  | ❌ 非代理  |

## SSL/TLS

| 设置                     | 值                                     | 说明                      |
| ------------------------ | -------------------------------------- | ------------------------- |
| ssl                      | `flexible`                             | CF↔Origin HTTP 明文（⚠️） |
| min_tls_version          | `1.0`                                  |                           |
| always_use_https         | `on`                                   |                           |
| automatic_https_rewrites | `on`                                   |                           |
| tls_1_3                  | `zrt`                                  | 0-RTT                     |
| hsts                     | `max_age=31536000, include_subdomains` |                           |

## 性能

| 设置                            | 值                 | 说明               |
| ------------------------------- | ------------------ | ------------------ |
| brotli                          | `on`               |                    |
| early_hints                     | `on`               |                    |
| http2                           | `on`               |                    |
| http3                           | `on`               |                    |
| 0rtt                            | `on`               |                    |
| cache_level                     | `aggressive`       |                    |
| edge_cache_ttl                  | `7200` (2h)        |                    |
| browser_cache_ttl               | `14400` (4h)       |                    |
| automatic_platform_optimization | `off`              |                    |
| minify                          | css/html/js 全 off | Next.js 已内建压缩 |
| websockets                      | `on`               |                    |
| proxy_read_timeout              | `100`              | 100 秒             |

## 安全

| 设置               | 值                |
| ------------------ | ----------------- |
| security_level     | `essentially_off` |
| waf                | `off`             |
| hotlink_protection | `on`              |
| advanced_ddos      | `on`              |
| browser_check      | `on`              |
| challenge_ttl      | `1800`            |

## Worker 路由

| 路由                                       | Worker       | 用途                    |
| ------------------------------------------ | ------------ | ----------------------- |
| `www.5572.net/api/proxy/segment*`          | 5572tv-proxy | MPEG-TS segments (边缘) |
| `www.5572.net/api/proxy/key*`              | 5572tv-proxy | AES-128 keys (边缘)     |
| `www.5572.net/api/proxy/stream*`           | 5572tv-proxy | FLV streams (边缘)      |
| `www.5572.net/api/douban/refresh-trailer*` | 5572tv-proxy | 预告片缓存 (边缘 24h)   |

## 代码注意事项

1. **`/api/proxy/m3u8`** 路由必须走 Next.js（不走 CF Worker）— 因为 M3U8 内容需要重写
2. **`/api/douban/refresh-trailer`** 已配置 CF 边缘 24h 缓存 — 避免重复调用 Douban API
3. Worker 路由变更后需通过 API 更新（wrangler deploy 不会自动更新 routes）
4. `ssl: flexible` — CF↔Origin 间为 HTTP，如需加密需改为 `full`
