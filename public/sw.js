const CACHE_NAME = '5572tv-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// StreamSaver.js functionality
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
      console.log('user aborted', reason);
      port.postMessage({ abort: true });
    },
  });
}

// PWA lifecycle
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

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

// Message handler (StreamSaver)
self.addEventListener('message', (event) => {
  const data = event.data;
  const port = event.ports[0];

  if (data === 'ping') {
    return;
  }

  const downloadUrl =
    data.url ||
    self.registration.scope +
      Math.random() +
      '/' +
      (typeof data === 'string' ? data : data.filename);
  const metadata = new Array(3);

  metadata[1] = data;
  metadata[2] = port;

  if (data.readableStream) {
    metadata[0] = data.readableStream;
  } else if (data.transferringReadable) {
    port.onmessage = (evt) => {
      port.onmessage = null;
      metadata[0] = evt.data.readableStream;
    };
  } else {
    metadata[0] = createStream(port);
  }

  urlDataMap.set(downloadUrl, metadata);
  port.postMessage({ download: downloadUrl });
});

// Fetch handler (PWA cache + StreamSaver)
self.addEventListener('fetch', (event) => {
  var url = new URL(event.request.url);

  // StreamSaver download handling
  if (url.pathname.startsWith('/download/')) {
    event.respondWith(
      (async () => {
        var token = url.pathname.split('/')[2];
        var payload = urlDataMap.get(token);
        if (!payload) {
          return new Response('Download not found', { status: 404 });
        }
        urlDataMap.delete(token);

        var stream = createStream(payload.port);
        var responseHeaders = new Headers({
          'Content-Type': payload.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${payload.filename || 'download'}"`,
          'Content-Transfer-Encoding': 'binary',
        });

        return new Response(stream, { headers: responseHeaders });
      })(),
    );
    return;
  }

  // 非下载请求 → 不拦截，让浏览器直接处理
  return;
});
