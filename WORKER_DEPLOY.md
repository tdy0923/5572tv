# Cloudflare Worker 部署指南

## 为什么需要 Cloudflare Worker

Vercel 部署的视频代理使用云服务器 IP，部分 CDN 会封锁这类 IP 返回 403。
Cloudflare Worker 运行在 CF 边缘网络，CDN 信任 CF IP，可以正常访问。

## 部署步骤

### 1. 注册 Cloudflare Workers（免费）

1. 访问 https://dash.cloudflare.com/sign-up
2. 注册账号（免费，不需要购买域名）
3. 登录后进入 Workers & Pages
4. 点击 "Create a Worker"
5. 选择 "Hello World" 模板
6. 点击 "Deploy"

### 2. 部署 Worker 脚本

1. 进入刚创建的 Worker
2. 点击 "Edit code"
3. 删除默认代码
4. 复制 `proxy.worker.js` 的完整内容
5. 点击 "Save and Deploy"

### 3. 获取 Worker URL

部署后你会得到一个 URL，格式如：

```
https://your-worker-name.your-subdomain.workers.dev
```

### 4. 配置站点

登录你的 5572 影视管理后台：

1. 进入 管理面板 → 站点配置
2. 找到 "视频代理" 配置项
3. 填入 Worker URL：
   ```
   https://your-worker-name.your-subdomain.workers.dev
   ```
4. 保存配置

### 5. 验证部署

测试 Worker 是否正常工作：

```bash
curl "https://your-worker.workers.dev/api/proxy/m3u8?url=https%3A%2F%2Fexample.com%2Ftest.m3u8"
```

应该返回 404（测试 URL 不存在）而不是 502。

## Worker 功能

- ✅ M3U8 代理（自动重写 segment URL）
- ✅ 视频分片代理（支持 Range 请求）
- ✅ 密钥代理
- ✅ 流代理
- ✅ 403 自动重试（换 UA + Referer）
- ✅ CORS 跨域支持
- ✅ 豆瓣预告片缓存

## 免费额度

Cloudflare Workers 免费额度：

- 每天 100,000 次请求
- 每次请求 10ms CPU 时间
- 对于个人使用完全足够

## 注意事项

- Worker URL 需要填写完整（包含 https://）
- 首次部署可能需要 1-2 分钟生效
- 如果遇到问题，可以在 Worker 日志中查看错误
