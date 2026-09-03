/**
 * APP 发布信息 —— 唯一数据源。
 *
 * 每次发布新 APK 时只需更新此文件，下载页 / 版本检查 / 更新提示全部自动同步。
 * 发布清单见 docs/RELEASE_CHECKLIST.md。
 */
export const APP_RELEASE = {
  version: '1.17.0',
  buildNumber: 2012,
  releaseNotes:
    '5572 影视 v1.17.0 更新内容：\n\n' +
    '1. 根治有播放源仍弹重试：开播后不再被误杀回加载屏\n' +
    '2. 手机播放器瘦身：控制条只留核心按钮，倍速/截图进设置\n' +
    '3. 全新应用图标：字库 5 + 播放三角，桌面不再裁边\n' +
    '4. 下线 AI 推荐与观影房，应用更轻更快',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0',
  forceUpdate: false,
  releaseDate: '2026-09-03',
};

/** 下载页未请求到版本信息时的兜底展示（version 与 APP_RELEASE 保持一致） */
export const DEFAULT_APK_INFO = {
  version: 'v1.17.0',
  sizeMb: '18',
};
