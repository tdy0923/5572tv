#!/usr/bin/env node
/**
 * Agnes AI 图片生成脚本
 * 用法: node scripts/generate-image.js "prompt" [size]
 * 示例: node scripts/generate-image.js "A futuristic city at night" "1024x768"
 */

const API_KEY = process.env.AGNES_API_KEY || 'sk-LEcnBdzOvy4CG0XRf3d9noOrdOA5oXY96DXkfdMdyslAn19y';
const API_BASE = 'https://apihub.agnes-ai.com/v1';

async function generateImage(prompt, size = '1024x768') {
  console.log(`正在生成图片: ${prompt}`);
  console.log(`尺寸: ${size}`);
  
  const response = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'agnes-image-2.1-flash',
      prompt: prompt,
      size: size,
      extra_body: {
        response_format: 'url',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`生成失败: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.[0]?.url;
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: node scripts/generate-image.js "prompt" [size]');
    console.log('示例: node scripts/generate-image.js "A futuristic city at night" "1024x768"');
    process.exit(1);
  }

  const prompt = args[0];
  const size = args[1] || '1024x768';

  try {
    const imageUrl = await generateImage(prompt, size);
    console.log('\n生成成功!');
    console.log(`图片URL: ${imageUrl}`);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

main();
