addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

async function handleRequest(request) {
  try {
    const url = new URL(request.url);

    // Douban 预告片缓存：CF 边缘缓存 24h，防止限流
    if (url.pathname === '/api/douban/refresh-trailer') {
      return handleTrailerCache(request, url);
    }

    if (url.pathname === '/') {
      return new Response(getRootHtml(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 其他请求返回404
    return jsonResponse({ error: 'Not found' }, 404);
  } catch {
    return jsonResponse({ error: 'Internal error' }, 500);
  }
}

// Douban 预告片缓存
async function handleTrailerCache(request, url) {
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return jsonResponse({ error: 'Missing url parameter' }, 400);
  }

  const decodedUrl = decodeURIComponent(targetUrl);

  // 验证URL格式
  try {
    new URL(decodedUrl);
  } catch {
    return jsonResponse({ error: 'Invalid URL format' }, 400);
  }

  // 验证是否为豆瓣域名（精确匹配）
  const allowedDomains = ['douban.com', 'doubanio.com'];
  const parsedUrl = new URL(decodedUrl);
  const isAllowed = allowedDomains.includes(parsedUrl.hostname);

  if (!isAllowed) {
    return jsonResponse({ error: 'Only douban domains are allowed' }, 403);
  }

  try {
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://movie.douban.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return jsonResponse(
        { error: 'Upstream returned ' + response.status },
        response.status,
      );
    }

    const headers = new Headers(response.headers);
    headers.set(
      'Access-Control-Allow-Origin',
      request.headers.get('Origin') || '',
    );
    headers.set('Cache-Control', 'public, max-age=86400'); // 24h cache

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return jsonResponse({ error: 'Fetch failed' }, 502);
  }
}

function jsonResponse(data, status, cors = false, req) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (cors && req) {
    headers['Access-Control-Allow-Origin'] = req.headers.get('Origin') || '';
    headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
    headers['Access-Control-Allow-Headers'] = '*';
  }
  return new Response(JSON.stringify(data), {
    status: status,
    headers,
  });
}

function getRootHtml() {
  return `<!DOCTYPE html>
<html>
<head><title>5572tv-proxy</title></head>
<body>
<h1>5572tv Cloudflare Worker</h1>
<p>Only douban trailer cache is active.</p>
<p>Video sources are accessed directly by the browser.</p>
</body>
</html>`;
}
