import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const VERSION_INFO = {
  version: '1.9.1',
  buildNumber: 1,
  releaseNotes:
    '5572 影视 v1.9.1 更新内容：\n\n' +
    '1. 修复登录密码验证错误（V2 用户无法登录）\n' +
    '2. 视频代理 CDN geo-block 降级处理\n' +
    '3. 移除注册密码复杂度过高要求',
  downloadUrl: 'https://www.5572.net/download/5572tv-android.apk',
  minRequiredVersion: '1.4.0',
  forceUpdate: false,
  releaseDate: '2026-07-11',
};

export async function GET(_request: NextRequest) {
  return NextResponse.json(VERSION_INFO, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
