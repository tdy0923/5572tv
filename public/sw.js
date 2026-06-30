const CACHE_NAME = '5572tv-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html',
];

// 缓存策略配置
const CACHE_STRATEGIES = {
  // 静态资源：Cache First
  static: ['/icons/', '/screenshots/', '/assets/'],
  // API 请求：Network First，失败时用缓存
  api: ['/api/'],
  // 图片：Cache First，失败时用网络
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  // 页面：Network First
  pages: ['/search', '/shortdrama', '/download'],
};

const urlDataMap = new Map();

function createStream(port) {
  return new ReadableStream({
    start(controller) {
      port.onmessage = ({ data }) => {
        if (data === 'end') {
          return controller.close();
        }
        if (data === 'abort') {
          controller.error('Aborted the download');
          return;
        }
        controller.enqueue(data);
      };
    },
    cancel(reason) {
      port.postMessage({ abort: true });
    },
  });
}

// 安装事件 - 预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to cache static assets:', err);
      });
    }),
  );
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// 消息处理
self.addEventListener('message', (event) => {
  const data = event.data;
  const port = event.ports[0];

  if (data === 'ping') return;

  // 跳过缓存
  if (data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }

  const filename = data.pathname
    ? data.pathname.split('/').pop() || 'download'
    : typeof data === 'string'
      ? data
      : 'download';

  const token = Math.random().toString(36).slice(2);
  const downloadUrl = '/download/' + token + '/' + filename;

  const metadata = new Array(3);
  metadata[1] = data;
  metadata[2] = port;

  if (data.transferringReadable) {
    port.onmessage = (evt) => {
      port.onmessage = null;
      metadata[0] = evt.data.readableStream;
    };
  } else {
    metadata[0] = createStream(port);
  }

  urlDataMap.set(token, metadata);
  port.postMessage({ download: downloadUrl });
});

// Fetch 事件处理
self.addEventListener('fetch', (event) => {
  var url = new URL(event.request.url);

  // 处理下载请求（APK 等静态文件直接放行）
  if (url.pathname.startsWith('/download/') && !url.pathname.endsWith('.apk')) {
    event.respondWith(handleDownload(url));
    return;
  }

  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 视频请求直接放行，不经过Service Worker缓存
  if (isVideoRequest(url.pathname)) {
    return; // 让浏览器直接处理视频请求
  }

  // API请求直接放行，不缓存（避免cookie问题）
  if (isApiRequest(url.pathname)) {
    return; // 让浏览器直接处理API请求
  }

  // 页面导航请求：Network First，离线时用缓存或offline.html
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 根据资源类型选择缓存策略
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
  } else if (isImageRequest(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
  }
});

// 缓存优先策略（静态资源、图片）
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.status !== 206) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

// 网络优先策略（API、页面）
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.status !== 206) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // 返回离线页面
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;
    return new Response('Offline', { status: 503 });
  }
}

// 判断是否为静态资源
function isStaticAsset(pathname) {
  return (
    CACHE_STRATEGIES.static.some((pattern) => pathname.startsWith(pattern)) ||
    pathname.includes('/_next/static/')
  );
}

// 判断是否为 API 请求
function isApiRequest(pathname) {
  return pathname.startsWith('/api/');
}

// 判断是否为图片请求
function isImageRequest(pathname) {
  return CACHE_STRATEGIES.images.some((ext) => pathname.endsWith(ext));
}

// 判断是否为视频请求（直接放行，不缓存）
function isVideoRequest(pathname) {
  return (
    pathname.includes('.m3u8') ||
    pathname.includes('.ts') ||
    pathname.includes('/segment') ||
    pathname.includes('/stream')
  );
}

// 处理下载请求
async function handleDownload(url) {
  var parts = url.pathname.split('/');
  var token = parts[2];
  if (!token) {
    return new Response('Download not found', { status: 404 });
  }
  var payload = urlDataMap.get(token);
  if (!payload) {
    return new Response('Download not found', { status: 404 });
  }
  urlDataMap.delete(token);

  var storedData = payload[1];
  var storedPort = payload[2];

  var filename = parts.slice(3).join('/') || 'download';
  var contentType = 'application/octet-stream';

  if (storedData && storedData.headers) {
    if (storedData.headers['Content-Type']) {
      contentType = storedData.headers['Content-Type'];
    }
    var disposition = storedData.headers['Content-Disposition'];
    if (disposition) {
      var match = disposition.match(/filename\*?=UTF-8''(.+)/);
      if (match) {
        filename = decodeURIComponent(match[1]);
      }
    }
  }

  var stream = payload[0];
  if (typeof stream === 'undefined') {
    stream = createStream(storedPort);
  }

  var responseHeaders = new Headers({
    'Content-Type': contentType,
    'Content-Disposition': 'attachment; filename="' + filename + '"',
    'Content-Transfer-Encoding': 'binary',
  });

  return new Response(stream, { headers: responseHeaders });
}
