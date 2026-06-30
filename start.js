#!/usr/bin/env node

/* eslint-disable no-console */
const http = require('http');
const fs = require('fs');
const path = require('path');

function generateManifest() {
  console.log('Generating manifest.json for Docker deployment...');
  try {
    require(path.join(__dirname, 'scripts', 'generate-manifest.js'));
  } catch (error) {
    console.error('Error calling generate-manifest.js:', error);
    throw error;
  }
}

generateManifest();

const APK_DIR = path.join(__dirname, 'static', 'download');
const APK_PATH = path.join(APK_DIR, '5572tv-android.apk');
// 备用路径：旧部署可能在 public/download 有文件
const APK_FALLBACK = path.join(
  __dirname,
  'public',
  'download',
  '5572tv-android.apk',
);
const PUBLIC_PORT = parseInt(process.env.PORT || '3000', 10);
const INTERNAL_PORT = PUBLIC_PORT + 1;
const HOSTNAME = process.env.HOSTNAME || 'localhost';

// Start Next.js on internal port
process.env.PORT = String(INTERNAL_PORT);
require('./server.js');

// Proxy server on public port
const server = http.createServer((req, res) => {
  const url = req.url || '';

  // Serve APK directly
  if (url.startsWith('/download/5572tv-android.apk')) {
    const apkFile = fs.existsSync(APK_PATH)
      ? APK_PATH
      : fs.existsSync(APK_FALLBACK)
        ? APK_FALLBACK
        : null;
    if (apkFile) {
      const stat = fs.statSync(apkFile);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="5572tv-android.apk"',
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=86400',
      });
      fs.createReadStream(apkFile).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
    return;
  }

  // Proxy everything else to Next.js
  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: INTERNAL_PORT,
      path: url,
      method: req.method,
      headers: { ...req.headers, host: req.headers.host },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', () => {
    res.writeHead(502);
    res.end('Bad Gateway');
  });
  req.pipe(proxyReq);
});

server.listen(PUBLIC_PORT, HOSTNAME, () => {
  console.log(
    `5572tv listening on ${HOSTNAME}:${PUBLIC_PORT} (proxying to :${INTERNAL_PORT})`,
  );
});

// Health check polling
const intervalId = setInterval(() => {
  const req = http.get(`http://127.0.0.1:${INTERNAL_PORT}/login`, (res) => {
    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      console.log('Next.js server is ready.');
      clearInterval(intervalId);
      setTimeout(executeCronJob, 30000);
      setInterval(executeCronJob, 60 * 60 * 1000);
    }
  });
  req.setTimeout(2000, () => req.destroy());
  req.on('error', () => {});
}, 1000);

function executeCronJob() {
  const cronUrl = `http://127.0.0.1:${INTERNAL_PORT}/api/cron`;
  console.log(`Executing cron job: ${cronUrl}`);
  const req = http.get(cronUrl, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Cron job executed successfully:', data);
      } else {
        console.error('Cron job failed:', res.statusCode, data);
      }
    });
  });
  req.on('error', (err) => console.error('Cron job error:', err));
  req.setTimeout(300000, () => {
    req.destroy();
  });
}
