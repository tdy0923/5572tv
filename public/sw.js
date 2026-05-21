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
  const url = event.request.url;
  const hijacked = urlDataMap.get(url);

  if (hijacked) {
    const [stream, data, port] = hijacked;
    urlDataMap.delete(url);

    const responseHeaders = new Headers({
      'Content-Type': 'application/octet-stream; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'",
      'X-Content-Security-Policy': "default-src 'none'",
      'X-WebKit-CSP': "default-src 'none'",
      'X-XSS-Protection': '1; mode=block',
    });

    if (data.headers) {
      for (const [key, value] of Object.entries(data.headers)) {
        responseHeaders.set(key, value);
      }
    }

    event.respondWith(new Response(stream, { headers: responseHeaders }));
    port.postMessage({ debug: 'Download started' });
    return;
  }

  // Skip streaming media - let them go directly to network
  if (/\.(m3u8|ts|key|m4s)$/i.test(event.request.url)) {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Network first for API calls, cache first for static assets
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)),
    );
  } else {
    event.respondWith(
      caches
        .match(event.request)
        .then((response) => response || fetch(event.request))
        .catch(() => new Response('Offline', { status: 503 })),
    );
  }
});
