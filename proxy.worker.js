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

    // 地域封锁CDN的封锁是概率性的：CF出口IP池约60%未被封，403时重试（5次≈99%成功）
    const geoBlocked = isGeoBlockedTarget(targetUrl);
    let relayUsed = false; // 经中继池取回时，重写基准需用原始URL（见下方）

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

    // 地域封锁CDN：继续重试，每次请求可能命中不同出口路径
    if (geoBlocked) {
      for (let i = 0; i < 4 && response.status === 403; i++) {
        try {
          await response.body?.cancel();
        } catch {}
        await new Promise((r) => setTimeout(r, 120 * (i + 1)));
        try {
          response = await fetch(targetUrl, {
            headers: buildHeaders(source),
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
          });
        } catch {}
      }
    }

    // 仍 403 → 公益中继池接力（独立出口IP池，轮换放大穿透率，不论是否名单内）
    if (response.status === 403) {
      try {
        await response.body?.cancel();
      } catch {}
      const relayed = await fetchViaRelays(targetUrl, buildHeaders(source));
      if (relayed) {
        response = relayed;
        relayUsed = true;
      }
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
    // ⚠️ 经中继池取回时 response.url 是中继地址（如 seep.eu.org/<原始URL>），
    // 直接用作重写基准会产生双层代理嵌套 → 必须回退到原始目标URL
    const rewriteBase = relayUsed ? targetUrl : finalUrl;
    let m3u8Content = await response.text();

    // 🚫 广告分片过滤：检测 DISCONTINUITY 短块（广告插入）并移除。
    // 与 Next.js 端 src/lib/hls-ad-filter.ts 保持一致的启发式：
    //   - URL 命中广告特征 → 移除
    //   - 非主块中片段数 ≤ 10、< 主块50%、总时长 < 25s 的短块 → 视为广告移除
    try {
      const segLines = m3u8Content.split('\n');
      const adUrlRe =
        /ads?\.(?:m3u8|ts|mp4|m4s|aac)|advert(?:isement)?|adbreak|commercial|\/promo\/|sponsor|doubleclick|googlesyndication|ffzyad|bytegoofy|[?&](?:is_?ad|ad[_=]|adid)=/i;
      // 解析片段
      const segs = [];
      for (let i = 0; i < segLines.length; i++) {
        const line = segLines[i].trim();
        if (line.startsWith('#EXTINF:')) {
          const next = i + 1 < segLines.length ? segLines[i + 1].trim() : '';
          const durM = line.match(/#EXTINF:([0-9.]+)/);
          if (next && !next.startsWith('#')) {
            segs.push({
              idx: i,
              dur: durM ? parseFloat(durM[1]) : 0,
              url: next,
              isAd: false,
            });
            i++;
          }
        }
      }
      if (segs.length > 0) {
        // URL 特征
        for (const s of segs) if (adUrlRe.test(s.url)) s.isAd = true;
        // DISCONTINUITY 分块短块检测
        const boundaries = [0];
        for (let i = 0; i < segLines.length; i++) {
          if (segLines[i].trim().startsWith('#EXT-X-DISCONTINUITY'))
            boundaries.push(i);
        }
        boundaries.push(segLines.length);
        const groups = [];
        for (let b = 0; b < boundaries.length - 1; b++) {
          const gs = segs.filter(
            (s) => s.idx >= boundaries[b] && s.idx < boundaries[b + 1],
          );
          if (gs.length) groups.push(gs);
        }
        if (groups.length > 1) {
          const main = groups.reduce((a, b) => (a.length >= b.length ? a : b));
          const mainCount = main.length || 1;
          for (const g of groups) {
            if (g === main) continue;
            if (g.some((s) => s.isAd)) {
              for (const s of g) s.isAd = true;
              continue;
            }
            const totalDur = g.reduce((sum, s) => sum + s.dur, 0);
            if (
              mainCount >= 8 &&
              g.length <= 10 &&
              g.length < mainCount * 0.5 &&
              totalDur < 25
            ) {
              for (const s of g) s.isAd = true;
            }
          }
        }
        const removeIdx = new Set();
        for (const s of segs)
          if (s.isAd) {
            removeIdx.add(s.idx);
            removeIdx.add(s.idx + 1);
          }
        m3u8Content = segLines
          .filter((_, idx) => !removeIdx.has(idx))
          .join('\n');
      }
    } catch (e) {
      // 广告过滤失败不应影响播放
    }

    const proxyBase = `${request.url.startsWith('https') ? 'https' : 'https'}://${url.host}/api/proxy`;
    // Deno 分片加速节点（东京/新加坡，离中国用户近）
    // 通过 wrangler --var 注入；未配置则全部分片走源站
    const denoBase =
      typeof DENO_SEGMENT_BASE !== 'undefined' ? DENO_SEGMENT_BASE : '';
    const denoToken =
      typeof DENO_PROXY_TOKEN !== 'undefined' ? DENO_PROXY_TOKEN : '';
    const rewritten = await rewriteM3U8(
      m3u8Content,
      rewriteBase,
      proxyBase,
      sourceParam,
      denoBase,
      denoToken,
      geoBlocked,
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
    let response = await fetch(targetUrl, {
      headers: buildHeaders(source || targetOrigin),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    // 403 时统一重试 + 公益中继池兜底（不论是否在 geo-blocked 名单内）
    if (response.status === 403) {
      try {
        await response.body?.cancel();
      } catch {}
      // 名单内的域名额外加重试（出口IP池概率穿透）
      if (isGeoBlockedTarget(targetUrl)) {
        for (let i = 0; i < 3 && response.status === 403; i++) {
          await new Promise((r) => setTimeout(r, 120 * (i + 1)));
          try {
            response = await fetch(targetUrl, {
              headers: buildHeaders(source || targetOrigin),
              redirect: 'follow',
              signal: AbortSignal.timeout(15000),
            });
          } catch {}
        }
      }
      if (response.status === 403) {
        try {
          await response.body?.cancel();
        } catch {}
        const relayed = await fetchViaRelays(
          targetUrl,
          buildHeaders(source || targetOrigin),
        );
        if (relayed) response = relayed;
      }
    }

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
    let response = await fetch(targetUrl, {
      headers: buildHeaders(),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    // 地域封锁CDN：KEY是AES流的命脉，403时重试+中继池兜底
    if (response.status === 403 && isGeoBlockedTarget(targetUrl)) {
      try {
        await response.body?.cancel();
      } catch {}
      for (let i = 0; i < 3 && response.status === 403; i++) {
        await new Promise((r) => setTimeout(r, 100 * (i + 1)));
        try {
          response = await fetch(targetUrl, {
            headers: buildHeaders(),
            redirect: 'follow',
            signal: AbortSignal.timeout(10000),
          });
        } catch {}
      }
      if (response.status === 403) {
        try {
          await response.body?.cancel();
        } catch {}
        const relayed = await fetchViaRelays(targetUrl, buildHeaders());
        if (relayed) response = relayed;
      }
    }

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
// 'deno' = 走 Deno Deploy 东京/新加坡（快，离中国用户近）
// 'origin' = 走源站德国 VPS（兜底，兼容性好）
// 首次遇到新 CDN 域名时经 Deno 探测可达性（缓存10分钟），可达即启用加速
const cdnRouteMap = new Map();
const denoProbeCache = new Map(); // hostname -> {ok, ts}

function getSegmentBase(hostname, proxyBase, denoBase) {
  const route = cdnRouteMap.get(hostname);
  if (route === 'deno') return denoBase;
  return proxyBase; // origin 兜底
}

async function probeDenoReachable(hostname, targetUrl, denoBase, denoToken) {
  if (!denoBase || !denoToken) return false;
  const cached = denoProbeCache.get(hostname);
  const now = Date.now();
  if (cached && now - cached.ts < 600000) return cached.ok; // 10分钟缓存

  let ok = false;
  try {
    // 用当前目标URL做HEAD探测：检验"Deno→该CDN"完整链路
    // 收到任何HTTP状态（含404死链/403防盗链）都证明网络可达；
    // 仅超时、连接失败、5xx视为不可达
    const probeUrl = `${denoBase}/segment?url=${encodeURIComponent(
      targetUrl,
    )}&token=${encodeURIComponent(denoToken)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(probeUrl, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    ok = res.status > 0 && res.status < 500;
  } catch {
    ok = false;
  }
  denoProbeCache.set(hostname, { ok, ts: now });
  return ok;
}

// 标记某个 CDN 的分片从 Deno 加载失败 → 后续走 origin
function markDenoFailed(hostname) {
  if (cdnRouteMap.size > 200) cdnRouteMap.clear(); // 防无限增长
  cdnRouteMap.set(hostname, 'origin');
}

async function rewriteM3U8(
  content,
  baseUrl,
  proxyBase,
  sourceParam,
  denoBase,
  denoToken,
  geoBlockedTarget,
) {
  const lines = content.split('\n');
  const result = [];
  const vars = new Map();

  // 分片路由决策（学习 LibreTV 全代理策略）：
  // - 地域封锁CDN → 分片也经本 Worker 中继（403重试+中继池兜底），
  //   彻底隔离 CDN 的 CORS/Referer/地域限制，任何网络环境的用户都能播
  // - 其他CDN → 探测Deno可达性；可达走Deno加速，否则走源站兜底
  let segmentBase = proxyBase;
  let segmentToken = '';
  if (geoBlockedTarget) {
    segmentBase = proxyBase; // 经本Worker，handleSegmentProxy 内有重试+中继
  } else if (denoBase && denoToken) {
    try {
      const segHost = new URL(baseUrl).hostname;
      const ok = await probeDenoReachable(
        segHost,
        baseUrl,
        denoBase,
        denoToken,
      );
      if (ok) {
        cdnRouteMap.set(segHost, 'deno');
        segmentBase = denoBase;
        segmentToken = `&token=${encodeURIComponent(denoToken)}`;
      }
    } catch {}
  }

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
        const tok = base === denoBase && segmentToken ? segmentToken : '';
        result.push(
          `${base}/segment?url=${encodeURIComponent(finalSrc)}${sourceParam}${tok}`,
        );
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

// 地域封锁CDN名单：对海外固定IP返回403，但CF出口IP池约60%可穿透
const GEO_BLOCKED_CDNS = [
  'yzzyssvip',
  'yzzyvip',
  'vvvip-plays',
  'high20-playback',
  'high23-playback',
  'high26-playback',
  'yzzy32-play',
  'yzzy28-play',
  'power34play',
  'ijycnd.com',
];

// 公益中继池：地域封锁CDN的m3u8救援
// 原理：各代理有独立出口IP池，穿透率互相独立，轮换放大成功率
// 实测（2026-08）：seep 100%穿透、corsapi约60%；mengze已死、corsworkers限流
// 策略：轮询起点 + 健康熔断（连败3次冷却30分钟）+ 全败返回原始错误
const RELAY_POOL = [
  {
    name: 'seep',
    build: (u) => `https://seep.eu.org/${u}`,
  },
  {
    name: 'corsapi',
    build: (u) =>
      `https://corsapi.smone.workers.dev/p/test?url=${encodeURIComponent(u)}`,
  },
];
let relayCursor = 0;
const relayHealth = new Map(); // name -> { fails, cooldownUntil }
const RELAY_COOLDOWN_MS = 30 * 60 * 1000;
const RELAY_MAX_FAILS = 3;

function relayIsDown(name) {
  const h = relayHealth.get(name);
  return !!(h && h.fails >= RELAY_MAX_FAILS && Date.now() < h.cooldownUntil);
}
function relayMarkFail(name) {
  const h = relayHealth.get(name) || { fails: 0, cooldownUntil: 0 };
  h.fails += 1;
  if (h.fails >= RELAY_MAX_FAILS) {
    h.cooldownUntil = Date.now() + RELAY_COOLDOWN_MS;
  }
  relayHealth.set(name, h);
}

async function fetchViaRelays(targetUrl, headers) {
  const n = RELAY_POOL.length;
  for (let k = 0; k < n; k++) {
    const idx = (relayCursor + k) % n;
    const relay = RELAY_POOL[idx];
    if (relayIsDown(relay.name)) continue;
    try {
      const res = await fetch(relay.build(targetUrl), {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        relayCursor = (idx + 1) % n; // 下次从下一个代理开始（负载分摊）
        relayHealth.delete(relay.name);
        return res;
      }
      try {
        await res.body?.cancel();
      } catch {}
      relayMarkFail(relay.name);
    } catch {
      relayMarkFail(relay.name);
    }
  }
  return null;
}

function isGeoBlockedTarget(url) {
  try {
    const u = url.toLowerCase();
    return GEO_BLOCKED_CDNS.some((cdn) => u.includes(cdn));
  } catch {
    return false;
  }
}

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
