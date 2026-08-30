#!/usr/bin/env node
/**
 * 构建检查：校验图片处理的关键不变量
 *
 * 背景：代码库大量使用 next/image 渲染"代理图片 URL"（/api/poster-cache、
 * /api/image-proxy 等，见 VideoCard / MiniVideoCard）。这类内部代理 URL 只有在
 * next.config 的 images.unoptimized === true 时才会被 next/image 原样输出为 <img src>；
 * 一旦有人把 unoptimized 关掉，next/image 会走 /_next/image 优化管线去 fetch 内部 API
 * 路由，导致代理图片全部 400/失效。
 *
 * 旧脚本试图禁止"对代理图片使用 next/image"，但：
 *   1) 前提过时（全局 unoptimized:true 下 next/image 本就安全）；
 *   2) 正则只匹配字面 src={processImageUrl}，漏掉了 src={actualPoster} 等真实用法（假阴性）。
 * 因此改为校验真正的不变量：images.unoptimized 必须为 true。
 */

const path = require('path');

const nextConfigPath = path.join(__dirname, '..', 'next.config.js');

let config;
try {
  // next.config.js 导出的是一个配置对象
  config = require(nextConfigPath);
} catch (err) {
  console.error(`❌ 无法加载 next.config.js: ${err.message}`);
  process.exit(1);
}

if (typeof config === 'function') {
  // 兼容 phase 函数式导出
  config = config('phase-production-build', {});
}

const unoptimized = config && config.images && config.images.unoptimized;

if (unoptimized !== true) {
  console.error(
    '\n❌ 图片配置不变量被破坏：next.config.js 的 images.unoptimized 必须为 true\n',
  );
  console.error(
    '原因：代码库用 next/image 渲染内部代理图片（/api/poster-cache、/api/image-proxy）。',
  );
  console.error(
    '关闭 unoptimized 会让 next/image 走 /_next/image 去 fetch 内部 API 路由，导致代理图片失效。',
  );
  console.error('如确需启用图片优化，请先把这些代理图片改回普通 <img>。\n');
  process.exit(1);
}

console.log('✅ 图片配置检查通过（images.unoptimized=true）');
