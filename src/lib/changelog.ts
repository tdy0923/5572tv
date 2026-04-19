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
    version: '1.0.1',
    date: '2026-04-17',
    added: [
      // 无新增内容
    ],
    changed: [
      '🎨 首页视觉升级：重构公共页面壳层、顶部导航、移动底部导航、分区标题与横向内容轨道，在不改动站点整体架构的前提下提升首页层次与质感',
      '🧩 卡片样式升级：统一视频卡片、短剧卡片与骨架卡片的圆角、阴影、悬浮反馈和信息区节奏，保持原有播放、收藏、右键和移动端交互逻辑不变',
    ],
    fixed: [
      '🖼️ 修复线上部分图片加载失败：远程图片默认切换为服务端代理链路，降低防盗链、跨域、证书异常和第三方图床直连失败导致的封面丢失问题',
    ],
  },
];

export default changelog;
