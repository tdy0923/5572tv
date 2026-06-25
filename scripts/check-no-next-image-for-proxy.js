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

const SRC_DIR = path.join(__dirname, '../src');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (/\.(tsx|ts)$/.test(file) && !file.endsWith('.d.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

let hasErrors = false;
const errors = [];

const files = walkDir(SRC_DIR);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  // 检查是否导入了next/image
  const hasNextImage = /from\s+['"]next\/image['"]/.test(content);
  if (!hasNextImage) continue;
  
  // 检查是否使用了代理图片
  const hasProxyImage = /processImageUrl|image-proxy|\/api\/image-proxy/.test(content);
  if (!hasProxyImage) continue;
  
  // 检查是否有 <Image src={processImageUrl...} 模式
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/<Image[\s\S]*?src=\{.*?processImageUrl/.test(line)) {
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
