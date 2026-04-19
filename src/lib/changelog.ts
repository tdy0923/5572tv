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
    version: '1.1.0',
    date: '2026-04-19',
    added: [
      // 无新增内容
    ],
    changed: [
      '性能优化：移除整站页面壳的强制动态渲染，恢复首屏可缓存能力，并为公共站点配置增加客户端短缓存，显著改善打开速度与页面响应',
      '界面统一：继续收口首页、搜索页、source-browser、播放页与移动端头部，让公告入口、卡片节奏和主要控件在所有页面保持一致',
    ],
    fixed: [
      '修复继续观看海报反复失效：统一播放记录、watching-updates、cron 刷新等封面链路，并补上旧记录读取时的自修复能力',
      '修复运行与上线问题：处理 image-proxy 相对重定向报错、cron 中 douban 无效详情源噪音，以及移动端部分页面缺失公告铃铛入口的问题',
    ],
  },
];

export default changelog;
