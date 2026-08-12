import { NextRequest, NextResponse } from 'next/server';

// 直接重定向到静态目录，避免 App Route 直接流式输出大体积 APK 触发响应大小限制
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.pathname = '/static/download/5572tv-android-armv7a.apk';
  return NextResponse.redirect(url, { status: 302 });
}
