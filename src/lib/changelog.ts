// 此文件由 scripts/convert-changelog.js 自动生成
// 请勿手动编辑

export interface ChangelogEntry {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  fixed: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.4.0',
    date: '2026-05-27',
    added: [
      // 无新增内容
    ],
    changed: [
      '🔧 Admin 面板拆分为 7 个独立子路由（config/categories/netdisk/live/settings/sources/users），从 9,906 行缩减至 1,400 行',
      '🔧 Live 页面拆分 ChannelSidebar/GroupSelectorModal 共享组件',
      '🔧 Play 页面提取 useSourceSearch/useTrailerFallback 自定义 hooks（7,820→7,230 行）',
      '⚡ 速度测试移除 20 源上限，全部源并发测速',
      '⚡ CDN 域名级阻断缓存 + 并行测速 + CDN 策略细分',
      '⚡ M3U8 proxy 添加 CDN-Cache-Control 短缓存 10s 减少 origin 压力',
      '🧹 清理 181 处 console.log + console.debug（全量审计）',
      '🧹 eslint-disable 注入 95 个 API 路由 + 59 个客户端文件',
      '🗑️ 删除 3 个未引用组件（WatchRoomSyncBanner/TVBoxTokenManager/ImportExportModal）',
      '🗑️ 移除 AI 摘要功能（未配置 API 密钥）',
      '📄 发版流程文档 + 一键发版脚本',
      '📄 gitignore 移除开发配置文件（jest/commitlint/hooks/kilo/vscode）',
    ],
    fixed: [
      '🐛 广告配置未加载 - runtimeConfig 缺失 AD_SETTINGS 字段',
      '🐛 useSearchParams 引用不稳定导致 effect 死循环',
      '🐛 速度测试进度显示 + 键盘快捷键 null 安全',
      '🐛 还原测速结果映射 - 并发重写遗漏 setPrecomputedVideoInfo',
      '🐛 弹幕双排 - 2000ms 初始加载跳过已加载数据',
      '🐛 douban_trailer 源跳过详情 API 避免 400 导致死循环',
      '🐛 video-proxy 上游错误 500 改 502（Bad Gateway）',
      '🐛 预告片 Douban URL 缓存 24h 改 1h - URL 过期导致 video-proxy 500',
      '🐛 回退路径移除 matchYearAndType 过滤 - 正片不再误跳预告片',
      '🐛 移除重复 inferType + 无用 _videoResolution 状态',
      '🐛 useSourceSwitching 解构 params 避免直接修改 + 清理残留代码',
      '🐛 m3u8 重写清除残留代码 + URL 使用 request URL 协议替代硬编码 http',
      '🐛 admin sections 数组类型安全 + Array.isArray 守卫',
      '🐛 admin content 页面 useEffect setState 用 rAF 包装',
      '🐛 image-proxy 并发请求候选 URL 避免逐个超时 60s',
      '🐛 视频测速直连 CDN 改走代理 - 解决 403 + CORS 导致死循环',
      '🐛 搜索结果匹配防御 - 防止类型错误导致 0 结果',
      '🐛 预告片改用 Bilibili 备用源（国内可用）+ 清理残留 TMDB 代码',
      '🐛 新功能/预告片页面添加 _reload 参数防止缓存',
      '🐛 CF Worker M3U8 加超时 + 修复重写逻辑',
      '🐛 Worker 部署降级 setup-node 到 v4 + corepack 安装 pnpm',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-05-23',
    added: [
      '✨ 即将上映影片搜索结果为空时自动搜索豆瓣并播放预告片',
      '✨ 新增 `/api/douban/search` 豆瓣搜索接口（网页抓取）',
      '✨ 健康检查脚本 `scripts/health-check.sh` + CI 自动巡检',
      '✨ CF Worker 部署 workflow + wrangler.toml',
    ],
    changed: [
      '⬆️ Node.js 20→22, Next.js 16.1→16.2, React 19.0→19.2',
      '⬆️ @mui/material 7→9, Jest 29→30, puppeteer 24→25',
      '⬆️ tailwindcss 4.1→4.3, framer-motion 12.18→12.40',
      '⬆️ 40+ 依赖升级至各版本最新',
      '🔧 `forwardRef` → React 19 props.ref 模式（VideoCard, GlassPanel）',
      '🔧 `@ts-ignore` → `@ts-expect-error`，移除不再需要的 5 处',
      '🔧 移除未用依赖 @mui/material/@emotion/react/@emotion/styled/react-icons',
      '🔧 CF Worker 只处理 segment/key/stream 边缘转发，M3U8 由 Next.js 重写',
      '🔧 豆瓣搜索改用网页抓取（移动端 API 已要求登录）',
      '📄 简化 README，只保留版本和下载信息',
    ],
    fixed: [
      '🐛 海报点击跳转播放页永远播放同一影片：`_reload` 时间戳强制刷新',
      '🐛 M3U8 EXT-X-STREAM-INF 行内 URI 属性未重写导致 404',
      '🐛 源循环重试死锁：全部源被标记失败后不再重试',
      "🐛 quickProbe `mode: 'no-cors'` 误判 403 为可用",
      '🐛 SW 下载功能 key/路径/data 不匹配',
      '🐛 成人内容过滤 `^` 锚点移除导致全部结果被误杀',
      '🐛 bangumi proxy 缺少 CORS 头',
      '🐛 弹幕自动重试与初始加载竞态导致双排重复文字',
      '🐛 健康检查 CI 环境误报（DNS/WAF/rate-limit 兼容）',
    ],
  },
  {
    version: '1.2.2',
    date: '2026-05-22',
    added: [
      '🚀 **Cloudflare Workers 边缘代理**：视频代理（/api/proxy/*）移至 CF 边缘节点',
      '🌐 **91 个播放源**：新增 13 个高质量采集源（yszsrc），总计 91 个播放源',
      '⏱️ **搜索 API 3 秒聚合**：首个非空结果提前返回',
      '🎯 **HEAD 预检三态**：ok/slow/fail',
      '🔄 **自适应重试**：源失败后指数退避（30s/2min/5min/10min）',
      '🛡️ **死循环熔断**：全部源失败时最多自动重试一次',
      '🧹 **切换视频重置状态**：每部新视频独立清除上一部残留的失败标记',
    ],
    changed: [
      '🎬 play page 播放流程重构：先播再测，后台继续收集其余源',
      '⚡ 搜索 API 重构：单源 20s + 3s 聚合提前返回',
      '📦 删除观影室功能（watch-room）及关联代码',
      '📄 更新部署文档，新增 Cloudflare Workers 部署指南',
    ],
    fixed: [
      '🐛 修复 proxy 路由对视频点播源返回 404（LiveConfig 查找硬依赖）',
      '🐛 修复 Service Worker 拦截流媒体请求的错误风暴',
      '🐛 修复播放器 allowCORS=true 导致非 CORS 源无法播放',
      '🐛 修复换源列表只显示一个源的问题（背景搜索异步时序 + 失败标记污染）',
      '🐛 修复搜索 API 8s 超时导致全源空返回',
      '🐛 全面修复 ESLint 29 个错误及 memoization 问题',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-05-18',
    added: [
      // 无新增内容
    ],
    changed: [
      // 无变更内容
    ],
    fixed: [
      '🐛 修复 `getAllUsers()` V1/V2 用户合并 bug',
      '🐛 修复豆瓣视频代理 403 Forbidden：修正 Referer 头为 movie.douban.com',
      '🐛 修复弹幕竞态条件：并发加载时返回 0 条弹幕的问题',
      '🐛 修复聊天同步阻塞保存：移除 StorageEvent 同派发反馈循环',
      '🐛 修复 viewport meta 标签重复',
      '🐛 修复 z-index 冲突（MobileActionSheet 与 MoreMenu）',
      '📱 底部导航触摸目标：最小宽度 48px（符合 Apple HIG 标准）',
      '📱 底部导航文字大小：10px → 12px',
      '📱 主内容区域添加 safe-area-inset-bottom（iPhone 刘海屏适配）',
      '📱 首页/搜索/豆瓣网格添加水平内边距',
      '📱 设置面板开关/按钮/下拉框触摸目标统一提升至 48px',
      '📱 登录 OIDC 按钮、收藏心形按钮、搜索删除按钮触摸优化',
      '📱 注册页输入框移动端左内边距优化',
      '📱 AuthShell 支持 100dvh 动态视口高度',
      '📱 Toaster 添加 safe-area-inset-top 避免灵动岛遮挡',
      '📱 骨架屏数量从 8 减少到 4（减少移动端浪费）',
      '📱 视频卡片集数标签字体 10px → 11px',
      '📱 视频卡片来源标签添加 max-w-full 防溢出',
      '📱 搜索结果列表视图海报移动端缩小',
      '📱 筛选按钮间距优化',
      '🎬 视频播放器高度响应式：手机 220px / 平板 280px / 桌面自适应',
      '🎬 剧集选择器高度上限 280px（手机端）',
      '🎬 进度条触摸区域扩大至 20px，指示器 14px',
      '🎬 平板专属 CSS 断点（769px-1024px）',
      '🎬 启用画面镜像（flip）、画面比例调节（aspectRatio）',
      '🎬 启用迷你进度条、自动恢复播放位置',
      '🎬 滑动手势：左右滑动快进/快退 ±60s',
      '🎬 滑动手势：右侧上下滑动调节音量',
      '🎬 滑动手势：左侧上下滑动调节亮度',
      '🎬 弹幕发送按钮手机端已启用',
      '🎬 弹幕输入框替换为移动端友好的浮动输入组件',
      '🎬 自动播放下一集：视频结束后 3 秒倒计时通知',
      '🎬 长按 2 倍速：按住 500ms 激松开恢复',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-04-17',
    added: [
      // 无新增内容
    ],
    changed: [
      '🎨 首页视觉升级：重构公共页面壳层、顶部导航、移动底部导航、分区标题与横向内容轨道',
      '🧩 卡片样式升级：统一视频卡片、短剧卡片与骨架卡片的圆角、阴影、悬浮反馈和信息区节奏',
    ],
    fixed: ['🖼️ 修复线上部分图片加载失败：远程图片默认切换为服务端代理链路'],
  },
];

export default changelog;
