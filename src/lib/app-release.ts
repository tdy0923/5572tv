/**
 * APP 发布信息 —— 唯一数据源。
 *
 * 每次发布新 APK 时只需更新此文件，下载页 / 版本检查 / 更新提示全部自动同步。
 * 发布清单见 docs/RELEASE_CHECKLIST.md。
 */
export const APP_RELEASE = {
  version: '1.12.0',
  buildNumber: 7,
  releaseNotes:
    '5572 影视 v1.12.0 更新内容：\n\n' +
    '1. 首页焦点大图恢复横图背景+预告片视频\n' +
    '2. 修复 APP 首次进入黑框闪烁问题\n' +
    '3. 短剧播放器统一为标准播放器\n' +
    '4. 修复继续观看短剧源 400 错误\n' +
    '5. 修复豆瓣预告片 API 路由问题',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0',
  forceUpdate: false,
  releaseDate: '2026-07-23',
};

/** 下载页未请求到版本信息时的兜底展示（version 与 APP_RELEASE 保持一致） */
export const DEFAULT_APK_INFO = {
  version: 'v1.12.0',
  sizeMb: '18',
};
