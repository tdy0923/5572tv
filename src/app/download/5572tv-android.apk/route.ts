import { NextRequest, NextResponse } from 'next/server';

// 直接重定向到静态目录，避免 App Route 直接流式输出大体积 APK 触发响应大小限制
// （Next.js App Router 对 route handler 返回的大 body 有 ~18MB 限制）
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.pathname = '/static/download/5572tv-android.apk';

  try {
    const { trackEvent } = await import('@/lib/analytics-store');
    trackEvent({
      type: 'download',
      ts: Date.now(),
      anon: 'download',
      apk: '5572tv-android.apk',
    });
  } catch {
    // 分析记录失败不影响下载
  }

  return NextResponse.redirect(url, { status: 302 });
}
