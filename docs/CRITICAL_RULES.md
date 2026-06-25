# 5572.net 关键规则 - 违反必出bug

## 1. 图片代理规则（最高优先级）

### 规则
- **豆瓣/manmankan图片必须通过 `/api/image-proxy` 代理**
- **使用代理的图片绝对不能用 `next/image`，必须用 `<img>` 标签**
- **next.config.js 必须保持 `unoptimized: true`**

### 原因
- 豆瓣图片有Referer防盗链，必须服务器代理绕过
- `next/image` 即使设置 `unoptimized: true`，仍通过 `/_next/image` 管线处理
- `/_next/image` 尝试内部fetch `/api/image-proxy?url=...` 失败，返回400

### 正确写法
```tsx
// ✅ 正确：使用 img 标签
<img src={processImageUrl(posterUrl)} alt="..." />

// ❌ 错误：使用 next/image
<Image src={processImageUrl(posterUrl)} alt="..." />
```

### 检查方式
```bash
npm run check:image-rules
```

---

## 2. 认证系统规则

### 规则
- Cookie格式：raw JSON（不encodeURIComponent）
- 签名格式：`username:role`（所有路由统一）
- auth.ts和proxy.ts都有向后兼容

### 检查清单
- [ ] register/route.ts 签名格式
- [ ] oidc/callback/route.ts 签名格式
- [ ] oidc/complete-register/route.ts 签名格式
- [ ] qr/confirm/route.ts 签名格式
- [ ] telegram/verify/route.ts 签名格式

---

## 3. 开发流程规则

### 必须执行
1. 修改前：阅读目标文件和相关代码
2. 修改后：运行 `npm run build` 验证
3. 部署前：运行 `npm run check:image-rules`

### 禁止事项
- 禁止未经测试就部署
- 禁止破坏已有功能的"优化"
- 禁止忽略已记录的规则
