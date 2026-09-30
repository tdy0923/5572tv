import { NextRequest, NextResponse } from 'next/server';

// 直接重定向到静态目录，避免 App Route 直接流式输出大体积 APK 触发响应大小限制
export async function GET(request: NextRequest) {
  const { resolvePublicBaseUrl } = await import('@/lib/site-url');
  const base = resolvePublicBaseUrl(
    request.headers.get('host'),
    request.headers.get('x-forwarded-proto') ??
      new URL(request.url).protocol.replace(/:$/, ''),
  );
  const target = base
    ? `${base}/static/download/5572tv-android-armv7a.apk`
    : (() => {
        const url = new URL(request.url);
        url.pathname = '/static/download/5572tv-android-armv7a.apk';
        return url.toString();
      })();

  try {
    const { trackEvent } = await import('@/lib/analytics-store');
    trackEvent({
      type: 'download',
      ts: Date.now(),
      anon: 'download',
      apk: '5572tv-android-armv7a.apk',
    });
  } catch {
    // 分析记录失败不影响下载
  }

  return NextResponse.redirect(target, { status: 302 });
}
