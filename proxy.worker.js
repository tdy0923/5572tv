addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;

  // OPTIONS preflight
  if (event.request.method === 'OPTIONS') {
    event.respondWith(handleOptions(event.request));
    return;
  }

  if (path === '/api/proxy/m3u8') {
    event.respondWith(handleM3U8Proxy(event.request, url));
  } else if (path === '/api/proxy/segment') {
    event.respondWith(handleSegmentProxy(event.request, url));
  } else if (path === '/api/proxy/key') {
    event.respondWith(handleKeyProxy(event.request, url));
  } else if (path === '/api/image-proxy') {
    event.respondWith(handleImageProxy(event.request, url, event));
  } else if (path === '/') {
    event.respondWith(
      new Response(getRootHtml(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    );
  } else {
    event.respondWith(jsonResponse({ error: 'Not found' }, 404));
  }
});

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

function addCorsHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS, POST');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Range, Origin, Accept, User-Agent, Authorization',
  );
  headers.set(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Content-Type, Accept-Ranges',
  );
  return headers;
}

function handleOptions(request) {
  const headers = addCorsHeaders(new Headers());
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(null, { status: 204, headers });
}

// ---------- M3U8 Proxy ----------

async function handleM3U8Proxy(request, url) {
  const targetUrl = decodeURIComponent(url.searchParams.get('url') || '');
  const source =
    url.searchParams.get('5572tv-source') ||
    url.searchParams.get('moontv-source');
  if (!targetUrl) {
    return jsonResponse({ error: 'Missing url' }, 400, true, request);
  }

  try {
    new URL(targetUrl);
  } catch {
    return jsonResponse({ error: 'Invalid url' }, 400, true, request);
  }

  const sourceParam = source
    ? `&5572tv-source=${encodeURIComponent(source)}`
    : '';

  try {
    let response = await fetch(targetUrl, {
      headers: buildHeaders(source),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    // 上游 403 时重试一次：去掉 Referer/Origin（部分 CDN 拒绝陌生来源）
    if (response.status === 403) {
      try {
        await response.body?.cancel();
      } catch {}
      const retryHeaders = buildHeaders(source);
      delete retryHeaders.Referer;
      delete retryHeaders.Origin;
      try {
        response = await fetch(targetUrl, {
          headers: retryHeaders,
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        });
      } catch {}
    }

    if (!response.ok) {
      // ⚠️ 绝不 302 直连：浏览器直连会被 CORS 拦截。
      // 始终透传上游状态并带 CORS 头，让 hls.js 拿到干净错误以切换线路
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'text/plain',
          'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'no-store',
        },
      });
    }

    const contentType = response.headers.get('Content-Type') || '';
    const isM3U8 =
      contentType.toLowerCase().includes('mpegurl') ||
      contentType.toLowerCase().includes('octet-stream') ||
      targetUrl.includes('.m3u8');

    if (!isM3U8) {
      // Non-M3U8 content (e.g. JSON response) — proxy as-is
      const proxyHeaders = addCorsHeaders(new Headers(response.headers));
      proxyHeaders.set(
        'Cache-Control',
        'public, max-age=10, stale-while-revalidate=30',
      );
      return new Response(response.body, {
        status: response.status,
        headers: proxyHeaders,
      });
    }

    // Rewrite M3U8 content
    const finalUrl = response.url;
    const m3u8Content = await response.text();
    const proxyBase = `${request.url.startsWith('https') ? 'https' : 'https'}://${url.host}/api/proxy`;
    const denoBase = 'https://seg.5572.net';
    const rewritten = rewriteM3U8(
      m3u8Content,
      finalUrl,
      proxyBase,
      sourceParam,
      denoBase,
    );

    const respHeaders = addCorsHeaders(new Headers());
    respHeaders.set(
      'Content-Type',
      contentType || 'application/vnd.apple.mpegurl',
    );
    respHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    respHeaders.set(
      'Content-Length',
      new TextEncoder().encode(rewritten).length.toString(),
    );

    return new Response(rewritten, {
      status: 200,
      headers: respHeaders,
    });
  } catch (err) {
    // 网络错误：返回 502 带 CORS，绝不 302 直连（会被浏览器 CORS 拦截）
    return jsonResponse({ error: '上游获取失败' }, 502, true, request);
  }
}

// ---------- Image Proxy (edge-cached) ----------

function isBlockedHost(hostname) {
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1)/i.test(
    hostname,
  );
}

// 边缘缓存图片：全球 CF 节点共享热海报，源站与豆瓣限流压力趋零。
// 回源仍走 Node 源站（保留镜像回退/去重/内存缓存逻辑）
async function handleImageProxy(request, url, event) {
  const targetUrl = url.searchParams.get('url') || '';
  if (!targetUrl) {
    return jsonResponse({ error: 'Missing url' }, 400, true, request);
  }
  let u;
  try {
    u = new URL(targetUrl);
  } catch {
    return jsonResponse({ error: 'Invalid url' }, 400, true, request);
  }
  if (!/^https?:$/.test(u.protocol) || isBlockedHost(u.hostname)) {
    return jsonResponse({ error: 'URL rejected' }, 403, true, request);
  }

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  try {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const r = new Response(hit.body, hit);
      r.headers.set('X-Edge-Cache', 'HIT');
      return r;
    }
  } catch {}

  let upstream;
  try {
    // 回源走内部别名 /api/poster-edge（不在 Worker 路由表内，避免自引用死循环）
    upstream = await fetch(
      `${url.origin}/api/poster-edge?url=${encodeURIComponent(targetUrl)}`,
      { headers: { 'User-Agent': UA } },
    );
  } catch {
    return jsonResponse({ error: '上游获取失败' }, 502, true, request);
  }
  if (!upstream.ok) {
    return new Response(null, {
      status: upstream.status,
      headers: addCorsHeaders(new Headers({ 'Cache-Control': 'no-store' })),
    });
  }
  const ct = upstream.headers.get('Content-Type') || '';
  if (!ct.startsWith('image/')) {
    return new Response(null, {
      status: 502,
      headers: addCorsHeaders(new Headers({ 'Cache-Control': 'no-store' })),
    });
  }
  const out = new Response(upstream.body, {
    status: 200,
    headers: addCorsHeaders(
      new Headers({
        'Content-Type': ct,
        // 边缘缓存 7 天 + 浏览器缓存 30 天
        'Cache-Control': 'public, max-age=2592000, s-maxage=604800',
      }),
    ),
  });
  try {
    event.waitUntil(cache.put(cacheKey, out.clone()));
  } catch {}
  return out;
}

// ---------- Segment Proxy ----------

async function handleSegmentProxy(request, url) {
  const targetUrl = decodeURIComponent(url.searchParams.get('url') || '');
  const source =
    url.searchParams.get('5572tv-source') ||
    url.searchParams.get('moontv-source');
  if (!targetUrl) {
    return jsonResponse({ error: 'Missing url' }, 400, true, request);
  }

  let targetOrigin = '';
  try {
    targetOrigin = new URL(targetUrl).origin;
  } catch {}

  try {
    const response = await fetch(targetUrl, {
      headers: buildHeaders(source || targetOrigin),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return jsonResponse(
        { error: 'Segment fetch failed: ' + response.status },
        response.status,
        true,
        request,
      );
    }

    const respHeaders = addCorsHeaders(new Headers(response.headers));
    respHeaders.set('Accept-Ranges', 'bytes');
    respHeaders.set('Cache-Control', 'public, max-age=3600'); // 1h edge cache

    return new Response(response.body, {
      status: response.status,
      headers: respHeaders,
    });
  } catch (err) {
    return jsonResponse({ error: 'Segment fetch error' }, 502, true, request);
  }
}

// ---------- Key Proxy ----------

const keyCache = new Map();
const KEY_CACHE_TTL = 600000; // 10 min

async function handleKeyProxy(request, url) {
  const targetUrl = decodeURIComponent(url.searchParams.get('url') || '');
  const source =
    url.searchParams.get('5572tv-source') ||
    url.searchParams.get('moontv-source');
  if (!targetUrl) {
    return jsonResponse({ error: 'Missing url' }, 400, true, request);
  }

  const cacheKey = targetUrl;
  const cached = keyCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < KEY_CACHE_TTL) {
    const respHeaders = addCorsHeaders(new Headers());
    respHeaders.set('Content-Type', 'application/octet-stream');
    respHeaders.set('Cache-Control', 'public, max-age=300');
    respHeaders.set('Content-Length', cached.data.byteLength.toString());
    return new Response(cached.data, { status: 200, headers: respHeaders });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: buildHeaders(),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return jsonResponse(
        { error: 'Key fetch failed' },
        response.status,
        true,
        request,
      );
    }

    const keyData = await response.arrayBuffer();

    keyCache.set(cacheKey, { data: keyData, ts: Date.now() });
    if (keyCache.size > 200) {
      const entries = [...keyCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < entries.length - 150; i++) {
        keyCache.delete(entries[i][0]);
      }
    }

    const respHeaders = addCorsHeaders(new Headers());
    respHeaders.set('Content-Type', 'application/octet-stream');
    respHeaders.set('Cache-Control', 'public, max-age=300');
    respHeaders.set('Content-Length', keyData.byteLength.toString());

    return new Response(keyData, { status: 200, headers: respHeaders });
  } catch (err) {
    return jsonResponse({ error: 'Key fetch error' }, 502, true, request);
  }
}

// ---------- M3U8 Rewriting ----------

function resolveUrl(base, relative) {
  if (!relative) return '';
  if (relative.startsWith('http://') || relative.startsWith('https://'))
    return relative;
  try {
    return new URL(
      relative,
      base.endsWith('/') ? base : base.substring(0, base.lastIndexOf('/') + 1),
    ).href;
  } catch {
    return relative;
  }
}

// 智能路由：按 CDN 域名决定分片走 Deno 边缘还是源站回源
// 'deno' = 走 seg.5572.net（快，离用户近）
// 'origin' = 走源站德国 VPS（兜底，兼容性好）
// 未列出的 CDN 默认走 origin，后续根据播放结果自动学习
const cdnRouteMap = new Map();

function getSegmentBase(hostname, proxyBase, denoBase) {
  const route = cdnRouteMap.get(hostname);
  if (route === 'deno') return denoBase;
  return proxyBase; // origin 兜底
}

// 标记某个 CDN 的分片从 Deno 加载失败 → 后续走 origin
function markDenoFailed(hostname) {
  if (cdnRouteMap.size > 200) cdnRouteMap.clear(); // 防无限增长
  cdnRouteMap.set(hostname, 'origin');
}

function rewriteM3U8(content, baseUrl, proxyBase, sourceParam, denoBase) {
  const lines = content.split('\n');
  const result = [];
  const vars = new Map();

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      result.push(line);
      continue;
    }

    // EXT-X-DEFINE variable
    if (trimmed.startsWith('#EXT-X-DEFINE:')) {
      const n = trimmed.match(/NAME="([^"]+)"/);
      const v = trimmed.match(/VALUE="([^"]+)"/);
      if (n && v) vars.set(n[1], v[1]);
      result.push(line);
      continue;
    }

    // Non-tag line = URL
    if (!trimmed.startsWith('#')) {
      const resolved = resolveUrl(baseUrl, trimmed);
      const finalSrc = substituteVars(resolved, vars);
      try {
        const segHost = new URL(finalSrc).hostname;
        const base = getSegmentBase(segHost, proxyBase, denoBase);
        const proxyUrl = `${base}/segment?url=${encodeURIComponent(finalSrc)}${sourceParam}`;
        result.push(proxyUrl);
      } catch {
        result.push(
          `${proxyBase}/segment?url=${encodeURIComponent(finalSrc)}${sourceParam}`,
        );
      }
      continue;
    }

    // Process tag-based URIs
    line = processTagUri(
      line,
      'URI',
      (uri) => {
        const resolved = resolveUrl(baseUrl, uri);
        const finalSrc = substituteVars(resolved, vars);
        return `${proxyBase}/segment?url=${encodeURIComponent(finalSrc)}${sourceParam}`;
      },
      '#EXT-X-MAP:',
      '#EXT-X-PART:',
      '#EXT-X-PRELOAD-HINT:',
      '#EXT-X-SESSION-DATA:',
      '#EXT-X-DATERANGE:',
    );

    line = processTagUri(
      line,
      'URI',
      (uri) => {
        const resolved = resolveUrl(baseUrl, uri);
        const finalSrc = substituteVars(resolved, vars);
        return `${proxyBase}/key?url=${encodeURIComponent(finalSrc)}${sourceParam}`;
      },
      '#EXT-X-KEY:',
      '#EXT-X-SESSION-KEY:',
    );

    line = processTagUri(
      line,
      'URI',
      (uri) => {
        const resolved = resolveUrl(baseUrl, uri);
        const finalSrc = substituteVars(resolved, vars);
        return `${proxyBase}/m3u8?url=${encodeURIComponent(finalSrc)}${sourceParam}`;
      },
      '#EXT-X-MEDIA:',
    );

    line = processTagUri(
      line,
      'SERVER-URI',
      (uri) => {
        const resolved = resolveUrl(baseUrl, uri);
        const finalSrc = substituteVars(resolved, vars);
        return `${proxyBase}/m3u8?url=${encodeURIComponent(finalSrc)}${sourceParam}`;
      },
      '#EXT-X-CONTENT-STEERING:',
    );

    line = processTagUri(
      line,
      'URI',
      (uri) => {
        const resolved = resolveUrl(baseUrl, uri);
        const finalSrc = substituteVars(resolved, vars);
        return `${proxyBase}/m3u8?url=${encodeURIComponent(finalSrc)}${sourceParam}`;
      },
      '#EXT-X-RENDITION-REPORT:',
    );

    // EXT-X-STREAM-INF: next line is a URL
    if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
      result.push(line);
      // Look ahead for the URL
      if (i + 1 < lines.length) {
        const nextIdx = i + 1;
        const nextLine = lines[nextIdx].trim();
        if (nextLine && !nextLine.startsWith('#')) {
          const resolved = resolveUrl(baseUrl, nextLine);
          const finalSrc = substituteVars(resolved, vars);
          const proxyUrl = `${proxyBase}/m3u8?url=${encodeURIComponent(finalSrc)}${sourceParam}`;
          result.push(proxyUrl);
          i++; // skip the next line
        }
      }
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

function processTagUri(line, attrName, rewriteFn, ...tagPrefixes) {
  const trimmed = line.trim();
  const isMatch = tagPrefixes.some((p) => trimmed.startsWith(p));
  if (!isMatch) return line;

  const regex = new RegExp(`${attrName}="([^"]+)"`);
  const match = trimmed.match(regex);
  if (!match) return line;

  const originalUri = match[1];
  if (!originalUri || originalUri === 'nan' || originalUri.includes('nan')) {
    return line;
  }

  try {
    const rewritten = rewriteFn(originalUri);
    return line.replace(match[0], `${attrName}="${rewritten}"`);
  } catch {
    return line;
  }
}

function substituteVars(text, vars) {
  if (!vars.size) return text;
  return text.replace(/\{\$([a-zA-Z0-9-_]+)\}/g, (match, name) => {
    return vars.has(name) ? vars.get(name) : match;
  });
}

// ---------- Helpers ----------

function buildHeaders(sourceDomain) {
  const h = {
    'User-Agent': UA,
    Accept: '*/*',
    'Accept-Encoding': 'identity',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  };
  let origin = '';
  if (sourceDomain) {
    origin = sourceDomain.startsWith('http')
      ? sourceDomain
      : 'https://' + sourceDomain;
    h['Referer'] = origin + '/';
    h['Origin'] = origin;
  }
  return h;
}

// ---------- Douban Trailer Cache ----------

async function handleTrailerCache(request, url) {
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return jsonResponse({ error: 'Missing url parameter' }, 400);
  }

  const decodedUrl = decodeURIComponent(targetUrl);

  try {
    new URL(decodedUrl);
  } catch {
    return jsonResponse({ error: 'Invalid URL format' }, 400);
  }

  const allowedDomains = ['douban.com', 'doubanio.com'];
  try {
    const parsedUrl = new URL(decodedUrl);
    if (!allowedDomains.includes(parsedUrl.hostname)) {
      return jsonResponse({ error: 'Only douban domains are allowed' }, 403);
    }
  } catch {
    return jsonResponse({ error: 'Invalid URL' }, 400);
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
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return jsonResponse({ error: 'Fetch failed' }, 502);
  }
}

// ---------- Utilities ----------

function jsonResponse(data, status, cors = false, req) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
  };
  if (cors && req) {
    headers['Access-Control-Allow-Origin'] = req.headers.get('Origin') || '*';
    headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
    headers['Access-Control-Allow-Headers'] = '*';
  }
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function getRootHtml() {
  return `<!DOCTYPE html>
<html>
<head><title>5572tv-proxy</title></head>
<body>
<h1>5572tv Cloudflare Worker</h1>
<p>Active: M3U8 / Segment / Key proxy + Douban trailer cache.</p>
</body>
</html>`;
}
