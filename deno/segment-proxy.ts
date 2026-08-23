// Deno Deploy — 视频分片代理
// 接收 /segment?url=<CDN地址>，回源拉取并加 CORS 头流式返回。
// 部署在 Deno Deploy 全球边缘节点（东京/新加坡），离中国用户近。

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

// 私有 IP / 内网地址检测（SSRF 防护）
function isBlockedHost(hostname: string): boolean {
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1)/i.test(
    hostname,
  );
}

function corsHeaders(): Headers {
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  h.set('Access-Control-Allow-Headers', '*');
  h.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  return h;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // 健康检查端点（部署验证用）
  if (path === '/' || path === '/health') {
    return new Response(
      JSON.stringify({ ok: true, service: 'segment-proxy' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (path !== '/segment' && path !== '/key') {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetUrl = url.searchParams.get('url') || '';
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    return new Response(JSON.stringify({ error: 'URL rejected' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': UA,
        Referer: `https://${parsed.host}/`,
        Accept: '*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });

    const headers = corsHeaders();
    headers.set(
      'Content-Type',
      upstream.headers.get('Content-Type') || 'application/octet-stream',
    );

    // 成功时分片可缓存（同一剧集多人观看命中边缘缓存）
    if (upstream.ok) {
      headers.set('Cache-Control', 'public, max-age=86400');
    } else {
      headers.set('Cache-Control', 'no-store');
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err) {
    // 超时/网络错误：返回 502 带 CORS，让 hls.js 感知并切换线路
    const headers = corsHeaders();
    headers.set('Cache-Control', 'no-store');
    return new Response(JSON.stringify({ error: '上游获取失败' }), {
      status: 502,
      headers,
    });
  }
});
