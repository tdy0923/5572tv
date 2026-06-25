#!/usr/bin/env node
/**
 * CI检查：禁止对代理图片使用next/image
 * 
 * 规则：使用 /api/image-proxy 的图片必须用 <img> 标签，不能用 next/image
 * 原因：next/image 即使 unoptimized:true 也会通过 /_next/image 管线处理
 *       无法fetch内部API路由，返回400错误
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SRC_DIR = path.join(__dirname, '../src');
const PROXY_PATTERN = /processImageUrl|image-proxy|\/api\/image-proxy/;
const NEXT_IMAGE_PATTERN = /from\s+['"]next\/image['"]/;
const JSX_IMAGE_PATTERN = /<Image[\s\S]*?src=\{.*?processImageUrl/;

let hasErrors = false;
const errors = [];

// 扫描所有tsx/ts文件
const files = glob.sync(`${SRC_DIR}/**/*.{tsx,ts}`, { ignore: '**/node_modules/**' });

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  // 检查是否导入了next/image
  const hasNextImage = NEXT_IMAGE_PATTERN.test(content);
  if (!hasNextImage) continue;
  
  // 检查是否使用了代理图片
  const hasProxyImage = PROXY_PATTERN.test(content);
  if (!hasProxyImage) continue;
  
  // 检查是否有 <Image src={processImageUrl...} 模式
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (JSX_IMAGE_PATTERN.test(line)) {
      const relativePath = path.relative(process.cwd(), file);
      errors.push(`${relativePath}:${i + 1} - 禁止对代理图片使用next/image，必须用<img>标签`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('\n❌ 检测到违规使用 next/image 处理代理图片：\n');
  errors.forEach(e => console.error(`  ${e}`));
  console.error('\n规则：代理图片（processImageUrl/image-proxy）必须用 <img> 标签');
  console.error('原因：next/image 无法正确处理内部API代理URL\n');
  process.exit(1);
} else {
  console.log('✅ 图片组件检查通过');
}
