/**
 * APP 发布信息 —— 唯一数据源。
 *
 * 每次发布新 APK 时只需更新此文件，下载页 / 版本检查 / 更新提示全部自动同步。
 * 发布清单见 docs/RELEASE_CHECKLIST.md。
 */
export const APP_RELEASE = {
  version: '1.14.0',
  buildNumber: 2009,
  releaseNotes:
    '5572 影视 v1.14.0 更新内容：\n\n' +
    '1. 修复播放失败黑屏/无限加载（增加错误提示与失败回调）\n' +
    '2. 修复 M3U8 代理失效问题\n' +
    '3. 修复分页卡死、返回键误退应用、主题不保存等体验问题\n' +
    '4. 搜索升级：适配 SSE 新事件、修复断线假完成、401 自动跳登录\n' +
    '5. 密码与登录态加密存储，提升账号安全\n' +
    '6. 修复 armv7a 设备无法更新问题',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0',
  forceUpdate: false,
  releaseDate: '2026-08-11',
};

/** 下载页未请求到版本信息时的兜底展示（version 与 APP_RELEASE 保持一致） */
export const DEFAULT_APK_INFO = {
  version: 'v1.14.0',
  sizeMb: '18',
};
