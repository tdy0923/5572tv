# Source Script System

源脚本系统允许管理员编写自定义 JavaScript 脚本来拦截和替换视频源的搜索、详情、播放解析逻辑。

## 功能概述

- **搜索脚本**：拦截搜索请求，自定义搜索结果
- **详情脚本**：拦截详情请求，自定义视频详情解析
- **播放脚本**：拦截播放 URL 解析，自定义播放地址

## 使用方法

### 管理界面

1. 登录管理员账号
2. 进入管理后台 → 内容源与发现 → 源脚本
3. 点击"新建脚本"创建脚本
4. 填写脚本信息：
   - **脚本名称**：便于识别
   - **目标源 Key**：脚本作用的视频源 key（如 `ffzy`, `hongniu`）
   - **搜索脚本**：自定义搜索逻辑
   - **详情脚本**：自定义详情解析逻辑
   - **播放脚本**：自定义播放 URL 解析

### 脚本语法

脚本是箭头函数体，接收上下文对象 `ctx`，返回结果对象。

#### 搜索脚本

```javascript
(ctx) => {
  // ctx.query       - 搜索关键词
  // ctx.headers     - 请求头
  // ctx.targetSource - 目标源 key

  // 返回格式：
  return {
    results: [
      {
        id: '视频ID',
        title: '视频标题',
        poster: '封面URL',
        episodes: ['ep1.m3u8', 'ep2.m3u8'],
        episodes_titles: ['第1集', '第2集'],
        class: '分类',
        year: '2024',
        desc: '描述',
        type_name: '类型',
        douban_id: 0,
        remarks: '备注',
      },
    ],
  };
};
```

#### 详情脚本

```javascript
(ctx) => {
  // ctx.id          - 视频ID
  // ctx.url         - 详情URL
  // ctx.headers     - 请求头
  // ctx.targetSource - 目标源 key

  // 返回格式（与搜索结果格式一致）：
  return {
    id: '视频ID',
    title: '视频标题',
    poster: '封面URL',
    episodes: ['ep1.m3u8', 'ep2.m3u8'],
    episodes_titles: ['第1集', '第2集'],
    class: '分类',
    year: '2024',
    desc: '描述',
    type_name: '类型',
    douban_id: 0,
    remarks: '备注',
  };
};
```

#### 播放脚本

```javascript
(ctx) => {
  // ctx.url         - 原始播放URL
  // ctx.headers     - 请求头
  // ctx.targetSource - 目标源 key

  // 返回格式（以下任一）：
  return ctx.url; // 直接返回URL字符串

  // 或返回带自定义请求头的对象：
  return {
    url: 'https://new-url.m3u8',
    headers: {
      Referer: 'https://example.com',
    },
  };
};
```

### 内置对象

脚本执行时可使用以下全局对象：

- `fetch` - 网络请求函数
- `JSON` - JSON 解析
- `Math` - 数学运算
- `Date` - 日期处理
- `RegExp` - 正则表达式
- `String`, `Array`, `Object` 等原生对象

### 禁止访问

以下全局对象在脚本中被禁用（设为 undefined）：

- `process` - Node.js 进程对象
- `require` / `module` / `exports` - CommonJS 模块
- `eval` / `Function` - 动态代码执行
- `global` / `globalThis` - 全局对象

## 示例

### 示例 1：自定义搜索（添加 Referer）

```javascript
(ctx) => {
  const url = `https://api.example.com/search?wd=${encodeURIComponent(ctx.query)}`;
  return fetch(url, {
    headers: {
      ...ctx.headers,
      Referer: 'https://www.example.com',
    },
  })
    .then((r) => r.json())
    .then((data) => ({
      results: data.list.map((item) => ({
        id: item.id,
        title: item.name,
        poster: item.pic,
        episodes: item.urls,
        episodes_titles: item.titles,
        class: item.type,
        year: item.year,
        desc: item.desc,
        type_name: item.type,
        douban_id: 0,
        remarks: item.remark,
      })),
    }));
};
```

### 示例 2：自定义播放地址解析

```javascript
(ctx) => {
  // 直接返回原始URL，或修改为代理地址
  if (ctx.url.includes('example.com')) {
    return {
      url: ctx.url.replace('example.com', 'proxy.example.com'),
      headers: {
        Referer: 'https://www.example.com',
      },
    };
  }
  return ctx.url;
};
```

## 安全注意事项

1. **沙箱执行**：脚本通过 `new Function()` 执行，禁止访问 Node.js 全局对象
2. **超时限制**：脚本执行超时限制为 5 秒
3. **管理员权限**：只有管理员/站长可以创建和管理脚本
4. **无持久化代码**：脚本以字符串形式存储，不写入文件系统

## API 接口

### GET /api/source-script

获取所有脚本列表（需要管理员权限）

### POST /api/source-script

创建或更新脚本

请求体：

```json
{
  "name": "脚本名称",
  "targetSource": "source_key",
  "enabled": true,
  "searchScript": "...",
  "detailScript": "...",
  "playScript": "..."
}
```

更新时需提供 `id` 字段。

### DELETE /api/source-script?id=xxx

删除指定脚本

### POST /api/source-script/test

测试脚本执行

请求体：

```json
{
  "action": "test",
  "type": "search",
  "script": "(ctx) => { ... }",
  "targetSource": "source_key",
  "testQuery": "测试关键词"
}
```

## 文件结构

```
src/
├── app/
│   ├── api/
│   │   └── source-script/
│   │       └── route.ts          # API 路由
│   └── admin/
│       ├── sections/
│       │   └── source-scripts.tsx # 管理界面组件
│       └── _content.tsx           # 添加导航入口
└── lib/
    └── source-script-executor.ts  # 脚本执行器
```
