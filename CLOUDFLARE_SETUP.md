# Cloudflare 配置指南

## 登录Cloudflare
1. 访问 https://dash.cloudflare.com
2. 使用 tdy0923@gmail.com 登录
3. 选择 5572.net 域名

## 免费方案优化配置

### 1. 缓存规则 (Cache Rules)
进入 Rules → Cache Rules，添加：

**规则1: 海报缓存**
- 当 URI 路径匹配 `/poster-cache/*`
- Cache Level: Cache Everything
- Edge TTL: 1 month
- Browser TTL: 1 month

**规则2: 视频缩略图缓存**
- 当 URI 路径匹配 `/video-cache/*`
- Cache Level: Cache Everything
- Edge TTL: 1 month
- Browser TTL: 1 month

**规则3: 静态资源缓存**
- 当文件扩展名匹配 `*.jpg, *.png, *.gif, *.svg, *.webp, *.ico`
- Cache Level: Cache Everything
- Edge TTL: 7 days

### 2. 页面规则 (Page Rules)
进入 Rules → Page Rules，添加：

**规则: API响应缓存**
- URL: `www.5572.net/api/poster-cache*`
- 设置: Cache Level: Cache Everything
- 设置: Edge Cache TTL: 1 month

### 3. 性能优化 (Speed → Optimization)
- **Auto Minify**: 勾选 JavaScript, CSS, HTML
- **Brotli**: 开启
- **Early Hints**: 开启
- **HTTP/2**: 已默认开启
- **HTTP/3 (QUIC)**: 开启（免费方案支持）

### 4. 图片优化 (Images)
- **Cloudflare Images**: 免费方案有 5,000 张免费图片
- **图片优化**: 开启 WebP 转换
- **图片调整大小**: 开启

### 5. 安全设置 (Security)
- **SSL/TLS**: Full (Strict)
- **Always Use HTTPS**: 开启
- **HSTS**: 开启
- **WAF**: 免费方案有基础防护

### 6. 网络优化 (Network)
- **HTTP/3**: 开启
- **0-RTT**: 开启
- **WebSocket**: 开启（如果需要实时功能）

## 验证配置

配置完成后，访问以下URL验证：

```
# 测试海报缓存
curl -I "https://www.5572.net/api/poster-cache?url=https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2929038414.jpg"

# 检查响应头应包含:
# CF-Cache-Status: HIT (命中缓存)
# Cache-Control: public, max-age=2592000
```

## 预期效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 首次图片加载 | ~300ms | ~300ms |
| 重复图片加载 | ~100ms | **~20ms** |
| 带宽消耗 | 高 | **降低80%** |
| 服务器负载 | 高 | **降低90%** |
