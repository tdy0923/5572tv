# RSC Migration Plan: page.tsx 拆分

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/rsc-migration.md)

## 目标

将 `src/app/page.tsx`（2150行 'use client'）拆分为 Server Component + Client Component。

## 当前状态

- page.tsx 是 `'use client'`，所有数据在客户端获取
- useHomePageQueries 通过 TanStack Query 在客户端请求 `/api/trending`
- 首屏加载需要等待 JS 下载 + hydration + API 请求

## 目标架构

```
src/app/page.tsx          → Server Component (async, 数据获取)
src/components/HomeClient.tsx → Client Component (交互逻辑)
```

## 执行步骤

### Step 1: 创建 HomeClient.tsx

- 从 page.tsx 复制全部内容
- 添加 `'use client'` 指令
- 导入所有需要的 hooks/组件
- 新增 prop: `initialTrendingData?: any`

### Step 2: 修改 page.tsx

- 移除 `'use client'`
- 导入 HomeClient
- 添加 async 数据获取:

```tsx
async function getInitialTrending() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/trending`,
      {
        cache: 'no-store',
      },
    );
    if (res.ok) return res.json();
  } catch {}
  return { results: [] };
}
```

- 默认导出改为 async:

```tsx
export default async function Page() {
  const trendingData = await getInitialTrending();
  return <HomeClient initialTrendingData={trendingData} />;
}
```

### Step 3: 修改 HomeClient 接收初始数据

- HomeClient 新增 prop 接口
- useHomePageQueries 改为接受 initialData 参数
- TanStack Query 用 initialData 做 SSR 填充

### Step 4: 验证

- `npx tsc --noEmit` — TypeScript 无错误
- `npx next build` — 构建通过
- 首页功能不变（tabs/模态框/搜索/收藏等）

## 关键约束

- Server Component 不能传函数/callback 给 Client Component
- 所有事件处理器必须在 HomeClient 内部定义
- 传给 HomeClient 的 props 必须可序列化（JSON.stringify可还原）
- NEXT_PUBLIC_SITE_URL 需要在 .env 中设置

## 文件变更预估

- `src/app/page.tsx` — 从 2150 行缩减到 ~50 行
- `src/components/HomeClient.tsx` — 新建，~2150 行
- `src/hooks/useHomePageQueries.ts` — 修改接受 initialData 参数
