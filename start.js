#!/usr/bin/env node

/* eslint-disable no-console */
const http = require('http');
const fs = require('fs');
const path = require('path');

// 调用 generate-manifest.js 生成 manifest.json
function generateManifest() {
  console.log('Generating manifest.json for Docker deployment...');

  try {
    const generateManifestScript = path.join(
      __dirname,
      'scripts',
      'generate-manifest.js',
    );
    require(generateManifestScript);
  } catch (error) {
    console.error('❌ Error calling generate-manifest.js:', error);
    throw error;
  }
}

generateManifest();

// APK 下载路径映射
const APK_PATH = path.join(
  __dirname,
  'static',
  'download',
  '5572tv-android.apk',
);

// 在 standalone server 启动前拦截 APK 下载请求
const originalCreateServer = http.createServer;
http.createServer = function (options, requestListener) {
  const wrappedListener = (req, res) => {
    if (req.url && req.url.startsWith('/download/5572tv-android.apk')) {
      try {
        const stat = fs.statSync(APK_PATH);
        res.writeHead(200, {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="5572tv-android.apk"',
          'Content-Length': String(stat.size),
          'Cache-Control': 'public, max-age=86400',
        });
        fs.createReadStream(APK_PATH).pipe(res);
      } catch {
        res.writeHead(404);
        res.end('Not Found');
      }
      return;
    }
    requestListener(req, res);
  };
  return originalCreateServer.call(http, options, wrappedListener);
};

// 直接在当前进程中启动 standalone Server（`server.js`）
require('./server.js');

// 每 1 秒轮询一次，直到请求成功
const TARGET_URL = `http://${process.env.HOSTNAME || 'localhost'}:${
  process.env.PORT || 3000
}/login`;

const intervalId = setInterval(() => {
  console.log(`Fetching ${TARGET_URL} ...`);

  const req = http.get(TARGET_URL, (res) => {
    // 当返回 2xx 状态码时认为成功，然后停止轮询
    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
      console.log('Server is up, stop polling.');
      clearInterval(intervalId);

      setTimeout(() => {
        // 服务器启动后，立即执行一次 cron 任务
        executeCronJob();
      }, 30000);

      // 然后设置每小时执行一次 cron 任务
      setInterval(
        () => {
          executeCronJob();
        },
        60 * 60 * 1000,
      ); // 每小时执行一次
    }
  });

  req.setTimeout(2000, () => {
    req.destroy();
  });
}, 1000);

// 执行 cron 任务的函数
function executeCronJob() {
  const cronUrl = `http://${process.env.HOSTNAME || 'localhost'}:${
    process.env.PORT || 3000
  }/api/cron`;

  console.log(`Executing cron job: ${cronUrl}`);

  const req = http.get(cronUrl, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Cron job executed successfully:', data);
      } else {
        console.error('Cron job failed:', res.statusCode, data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('Error executing cron job:', err);
  });

  req.setTimeout(300000, () => {
    console.error('Cron job timeout (5 minutes)');
    req.destroy();
  });
}
