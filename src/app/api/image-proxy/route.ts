import * as https from 'https';
import { NextResponse } from 'next/server';

import { DEFAULT_USER_AGENT } from '@/lib/user-agent';

export const runtime = 'nodejs';

// https agent with rejectUnauthorized: false for expired-cert image CDNs
const insecureHttpsAgent = new https.Agent({ rejectUnauthorized: false });

function buildCandidateImageUrls(imageUrl: string): string[] {
  const candidates = new Set<string>();

  try {
    const url = new URL(imageUrl);
    const isDoubanImage = url.hostname.includes('doubanio.com');

    if (isDoubanImage && url.protocol === 'http:') {
      url.protocol = 'https:';
    }

    candidates.add(url.toString());

    if (isDoubanImage) {
      const hostVariants = [
        'img3.doubanio.com',
        'img1.doubanio.com',
        'img9.doubanio.com',
      ];
      for (const host of hostVariants) {
        const variantUrl = new URL(url.toString());
        variantUrl.hostname = host;
        candidates.add(variantUrl.toString());
      }
    }
  } catch {
    candidates.add(imageUrl);
  }

  return Array.from(candidates);
}

function isValidImageContentType(contentType: string | null): boolean {
  if (!contentType) return true;
  return (
    contentType.startsWith('image/') ||
    contentType === 'application/octet-stream'
  );
}

async function fetchWithInsecureHttps(
  imageUrl: string,
  fetchHeaders: HeadersInit,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(imageUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      agent: insecureHttpsAgent,
      headers: fetchHeaders as Record<string, string>,
    };
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve(
          new Response(body, {
            status: res.statusCode ?? 200,
            headers: res.headers as Record<string, string>,
          }),
        );
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// 图片代理接口 - 解决防盗链和 Mixed Content 问题
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  // URL 格式验证
  try {
    new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

  try {
    // 动态设置 Referer 和 Origin（根据图片源域名）
    const imageUrlObj = new URL(imageUrl);
    const isDoubanImage = imageUrlObj.hostname.includes('doubanio.com');
    const sourceOrigin = isDoubanImage
      ? 'https://movie.douban.com'
      : `${imageUrlObj.protocol}//${imageUrlObj.host}`;

    // 构建请求头
    const fetchHeaders: HeadersInit = {
      Referer: sourceOrigin + '/',
      Origin: sourceOrigin,
      'User-Agent': DEFAULT_USER_AGENT,
      Accept:
        'image/avif,image/webp,image/jxl,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
    };

    const candidateUrls = buildCandidateImageUrls(imageUrl);
    let imageResponse: Response | null = null;
    let finalImageUrl = candidateUrls[0];
    let lastError: Error | null = null;

    for (const candidateUrl of candidateUrls) {
      try {
        let response: Response;
        try {
          response = await fetch(candidateUrl, {
            signal: controller.signal,
            headers: fetchHeaders,
          });
        } catch (fetchError: any) {
          // SSL cert error (e.g. expired cert) - retry with rejectUnauthorized: false
          if (
            candidateUrl.startsWith('https://') &&
            (fetchError.code === 'CERT_HAS_EXPIRED' ||
              fetchError.cause?.code === 'CERT_HAS_EXPIRED' ||
              fetchError.message?.includes('certificate'))
          ) {
            response = await fetchWithInsecureHttps(candidateUrl, fetchHeaders);
          } else {
            throw fetchError;
          }
        }

        const contentType = response.headers.get('content-type');
        if (response.ok && isValidImageContentType(contentType)) {
          imageResponse = response;
          finalImageUrl = candidateUrl;
          break;
        }

        lastError = new Error(
          `Upstream returned ${response.status} ${response.statusText || ''} (${contentType || 'unknown content-type'})`,
        );
      } catch (fetchError: any) {
        lastError =
          fetchError instanceof Error
            ? fetchError
            : new Error(String(fetchError));
      }
    }

    clearTimeout(timeoutId);

    if (!imageResponse) {
      throw lastError || new Error('No valid upstream image response');
    }

    const contentType = imageResponse.headers.get('content-type');

    if (!imageResponse.body) {
      return NextResponse.json(
        { error: 'Image response has no body' },
        { status: 500 },
      );
    }

    // 创建响应头
    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // 传递Content-Length以支持进度显示和更好的缓存（如果上游提供）
    const contentLength = imageResponse.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // 设置缓存头 - 缓存7天（604800秒），允许重新验证
    headers.set(
      'Cache-Control',
      'public, max-age=604800, stale-while-revalidate=86400',
    );
    headers.set('CDN-Cache-Control', 'public, s-maxage=604800');
    headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=604800');
    headers.set('Netlify-Vary', 'query');

    // 添加 CORS 支持
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('X-Image-Source', finalImageUrl);

    // 直接返回图片流
    return new Response(imageResponse.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    clearTimeout(timeoutId);

    // 错误类型判断
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Image fetch timeout (15s)' },
        { status: 504 },
      );
    }

    console.error('[Image Proxy] Error fetching image:', error.message);
    return NextResponse.json(
      { error: 'Error fetching image', details: error.message },
      { status: 502 },
    );
  }
}

// 处理 CORS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
