/**
 * Version Check API
 * APP更新检查接口
 * 返回最新版本信息供APP检查更新
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 版本信息（发布新版本时更新这里）
const VERSION_INFO = {
  version: '1.4.0',
  buildNumber: 1,
  releaseNotes: '5572 影视 v1.4.0 更新内容：\n\n' +
    '1. 品牌统一：5572 影视全新品牌标识\n' +
    '2. 图片优化：海报本地化缓存，加载更快\n' +
    '3. 播放修复：修复播放器加载状态问题\n' +
    '4. UI优化：金黄色主题与主站一致\n' +
    '5. 性能提升：减少网络请求，提升响应速度',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.3.0', // 最低要求版本
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
