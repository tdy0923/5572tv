#!/bin/bash
# Cloudflare 缓存清理脚本
# 用于部署后清除旧缓存

# 配置（从环境变量读取，不要硬编码）
CF_API_KEY="${CF_API_KEY}"
CF_ZONE_ID="${CF_ZONE_ID}"
CF_EMAIL="${CF_EMAIL}"

if [ -z "$CF_API_KEY" ] || [ -z "$CF_ZONE_ID" ]; then
    echo "错误: 请设置 CF_API_KEY 和 CF_ZONE_ID 环境变量"
    echo "用法: CF_API_KEY=xxx CF_ZONE_ID=xxx ./cloudflare-purge-cache.sh"
    exit 1
fi

echo "正在清除 Cloudflare 缓存..."

# 清除所有缓存
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "X-Auth-Email: ${CF_EMAIL}" \
    -H "X-Auth-Key: ${CF_API_KEY}" \
    -H "Content-Type: application/json" \
    --data '{"purge_all": true}'

echo ""
echo "缓存清除完成"
