const CACHE_NAME = '5572tv-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

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

self.addEventListener('message', (event) => {
  const data = event.data;
  const port = event.ports[0];

  if (data === 'ping') return;

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

self.addEventListener('fetch', (event) => {
  var url = new URL(event.request.url);

  if (url.pathname.startsWith('/download/')) {
    event.respondWith(
      (async () => {
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
      })(),
    );
    return;
  }

  return;
});
