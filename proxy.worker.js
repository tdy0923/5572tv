addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

async function handleRequest(request) {
  try {
    const url = new URL(request.url);

    if (
      url.pathname === '/api/proxy/segment' ||
      url.pathname === '/api/proxy/key'
    ) {
      return handleSegmentProxy(request, url);
    }

    if (
      url.pathname === '/api/proxy/stream' ||
      url.pathname === '/api/proxy/m3u8'
    ) {
      return handleStreamProxy(request, url);
    }

    if (url.pathname === '/') {
      return new Response(getRootHtml(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return handleGenericProxy(request, url);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function handleSegmentProxy(request, url) {
  var targetUrl = url.searchParams.get('url');
  if (!targetUrl) return jsonResponse({ error: 'Missing url' }, 400);

  var decodedUrl = decodeURIComponent(targetUrl);
  var source = url.searchParams.get('5572tv-source') || '';

  if (request.headers.get('range')) {
    return fetchWithRange(request, decodedUrl, source);
  }

  var response = await fetch(decodedUrl, {
    headers: buildFetchHeaders(decodedUrl),
    redirect: 'follow',
  });

  if (!response.ok && response.status === 403) {
    try {
      response.body.cancel();
    } catch {}
    response = await fetch(decodedUrl, {
      headers: buildRetryHeaders(decodedUrl),
      redirect: 'follow',
    });
  }

  var respHeaders = new Headers(response.headers);
  setCorsHeaders(respHeaders);
  respHeaders.set('Cache-Control', 'public, max-age=1800');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
}

async function fetchWithRange(request, url, source) {
  var headers = buildFetchHeaders(url);
  headers.set('Range', request.headers.get('range'));
  var response = await fetch(url, { headers, redirect: 'follow' });

  if (!response.ok && response.status === 403) {
    try {
      response.body.cancel();
    } catch {}
    headers = buildRetryHeaders(url);
    headers.set('Range', request.headers.get('range'));
    response = await fetch(url, { headers, redirect: 'follow' });
  }

  var respHeaders = new Headers(response.headers);
  setCorsHeaders(respHeaders);
  respHeaders.set('Cache-Control', 'public, max-age=1800');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
}

async function handleStreamProxy(request, url) {
  var targetUrl = url.searchParams.get('url');
  if (!targetUrl) return jsonResponse({ error: 'Missing url' }, 400);

  var decodedUrl = decodeURIComponent(targetUrl);
  var response = await fetch(decodedUrl, {
    headers: buildFetchHeaders(decodedUrl),
    redirect: 'follow',
  });

  if (!response.ok && response.status === 403) {
    try {
      response.body.cancel();
    } catch {}
    response = await fetch(decodedUrl, {
      headers: buildRetryHeaders(decodedUrl),
      redirect: 'follow',
    });
  }

  var respHeaders = new Headers(response.headers);
  setCorsHeaders(respHeaders);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
}

function buildFetchHeaders(targetUrl) {
  var h = new Headers();
  h.set('User-Agent', UA);
  h.set('Accept', '*/*');
  h.set('Accept-Encoding', 'identity');
  try {
    var parsed = new URL(targetUrl);
    h.set('Referer', parsed.origin + '/');
    h.set('Origin', parsed.origin);
  } catch {}
  return h;
}

function buildRetryHeaders(targetUrl) {
  var uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/147.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
    'Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
  ];
  var h = new Headers();
  h.set('User-Agent', uas[Math.floor(Math.random() * uas.length)]);
  h.set('Accept', '*/*');
  h.set('Accept-Encoding', 'identity');
  return h;
}

async function handleGenericProxy(request, url) {
  var actualUrlStr = decodeURIComponent(url.pathname.replace('/', ''));
  actualUrlStr = ensureProtocol(actualUrlStr, url.protocol);
  actualUrlStr += url.search;

  var newHeaders = filterHeaders(request.headers, function (name) {
    return !name.startsWith('cf-');
  });

  var modifiedRequest = new Request(actualUrlStr, {
    headers: newHeaders,
    method: request.method,
    body: request.body,
    redirect: 'manual',
  });

  var response = await fetch(modifiedRequest);
  var body = response.body;

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    return handleRedirect(response, body);
  } else if (response.headers.get('Content-Type')?.includes('text/html')) {
    body = await handleHtmlContent(
      response,
      url.protocol,
      url.host,
      actualUrlStr,
    );
  }

  var modifiedResponse = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  setNoCacheHeaders(modifiedResponse.headers);
  setCorsHeaders(modifiedResponse.headers);
  return modifiedResponse;
}

function ensureProtocol(urlStr, defaultProtocol) {
  return urlStr.startsWith('http://') || urlStr.startsWith('https://')
    ? urlStr
    : defaultProtocol + '//' + urlStr;
}

function handleRedirect(response, body) {
  var location = new URL(response.headers.get('location'));
  var modifiedLocation = '/' + encodeURIComponent(location.toString());
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: Object.assign({}, response.headers, {
      Location: modifiedLocation,
    }),
  });
}

async function handleHtmlContent(response, protocol, host, actualUrlStr) {
  var originalText = await response.text();
  return replaceRelativePaths(
    originalText,
    protocol,
    host,
    new URL(actualUrlStr).origin,
  );
}

function replaceRelativePaths(text, protocol, host, origin) {
  var regex = /((href|src|action)=["'])\/(?!\/)/g;
  return text.replace(
    regex,
    '$1' + protocol + '//' + host + '/' + origin + '/',
  );
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function filterHeaders(headers, filterFunc) {
  return new Headers(
    [...headers].filter(function (pair) {
      return filterFunc(pair[0]);
    }),
  );
}

function setNoCacheHeaders(headers) {
  headers.set('Cache-Control', 'no-store');
}

function setCorsHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  headers.set('Access-Control-Allow-Headers', '*');
}

function getRootHtml() {
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="utf-8">\n  <title>5572TV Proxy</title>\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0f0f0}.card{background:#fff;border-radius:8px;padding:2rem;box-shadow:0 2px 8px rgba(0,0,0,.1);text-align:center}h1{color:#333;font-size:1.5rem}p{color:#666}</style>\n</head>\n<body>\n  <div class="card">\n    <h1>5572TV Proxy Worker</h1>\n    <p>Video proxy running at the edge.</p>\n  </div>\n</body>\n</html>';
}
