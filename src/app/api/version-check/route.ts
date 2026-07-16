import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERSION_INFO = {
  version: '1.11.0',
  buildNumber: 6,
  releaseNotes:
    '5572 影视 v1.11.0 更新内容：\n\n' +
    '1. 全站 Fluent 2 设计升级（开屏/导航/搜索/列表/播放/登录/菜单）\n' +
    '2. 全新 APP 图标（金色渐变 + 播放按钮 + 圆角边框）\n' +
    '3. APK 拆分为单架构（arm64/armv7a 各 ~18MB，大幅减小体积）\n' +
    '4. 换源检测数据恢复显示（速度/分辨率）\n' +
    '5. 下载页二维码点击放大\n' +
    '6. 安全修复（Telegram认证/登录加密/Cron安全）',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0',
  forceUpdate: false,
  releaseDate: '2026-07-16',
};

export async function GET(_request: NextRequest) {
  return NextResponse.json(VERSION_INFO, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
