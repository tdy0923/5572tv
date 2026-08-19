#!/usr/bin/env node
/* eslint-disable */
// 根据 NEXT_PUBLIC_SITE_NAME 动态生成 manifest.json

const fs = require('fs');
const path = require('path');

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const manifestPath = path.join(publicDir, 'manifest.json');

// 从环境变量获取站点名称
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '5572影视';

// manifest.json 模板
const manifestTemplate = {
  id: '/',
  name: siteName,
  short_name: siteName,
  description: '5572影视 - 影视聚合与在线播放',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui', 'browser'],
  shortcuts: [
    {
      name: '搜索',
      short_name: '搜索',
      description: '搜索电影、剧集、动漫',
      url: '/search',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: '下载 APP',
      short_name: '下载',
      description: '下载 5572 影视官方客户端',
      url: '/download',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
    {
      name: '直播电视',
      short_name: '直播',
      description: '观看电视直播',
      url: '/live',
      icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
    },
  ],
  background_color: '#000000',
  theme_color: '#0c111c',
  'apple-mobile-web-app-capable': 'yes',
  'apple-mobile-web-app-status-bar-style': 'black',
  icons: [
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-256x256.png',
      sizes: '256x256',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
};

try {
  // 确保 public 目录存在
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 写入 manifest.json
  fs.writeFileSync(manifestPath, JSON.stringify(manifestTemplate, null, 2));
  console.log(`✅ Generated manifest.json with site name: ${siteName}`);
} catch (error) {
  console.error('❌ Error generating manifest.json:', error);
  process.exit(1);
}
