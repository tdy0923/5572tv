import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERSION_INFO = {
  version: '1.6.0',
  buildNumber: 1,
  releaseNotes: '5572 影视 v1.6.0 更新内容：\n\n' +
    '1. 海报修复：图片加载问题已彻底解决\n' +
    '2. 搜索功能：手机端搜索恢复正常\n' +
    '3. 导航优化：统一导航系统，体验更流畅\n' +
    '4. 首页改版：热门推荐数据全面更新',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0',
  forceUpdate: false,
  releaseDate: '2025-06-28',
};

export async function GET(_request: NextRequest) {
  return NextResponse.json(VERSION_INFO, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
