/**
 * Version Check API
 * APP更新检查接口
 * 返回最新版本信息供APP检查更新
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 版本信息（发布新版本时更新这里）
const VERSION_INFO = {
  version: '1.5.0',
  buildNumber: 1,
  releaseNotes: '5572 影视 v1.5.0 更新内容：\n\n' +
    '1. 图片修复：海报显示问题已修复\n' +
    '2. 播放优化：视频播放更稳定\n' +
    '3. 性能提升：图片加载速度提升\n' +
    '4. 品牌统一：金黄色主题与主站一致',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0', // 最低要求版本
  forceUpdate: false, // 是否强制更新
  releaseDate: '2025-06-26',
};

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(VERSION_INFO, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get version info' },
      { status: 500 }
    );
  }
}
