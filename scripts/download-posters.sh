#!/bin/bash
# 批量下载海报到本地服务器
# 使用方法: ./download-posters.sh [海报列表文件]

CACHE_DIR="/root/www.5572.net/public/poster-cache"
LOG_FILE="/tmp/poster-download.log"

# 创建缓存目录
mkdir -p "$CACHE_DIR"

# 从stdin或文件读取海报URL列表
download_poster() {
    local url="$1"
    
    # 提取内容ID
    if [[ "$url" =~ /public/(p[0-9]+)\. ]]; then
        local content_id="${BASH_REMATCH[1]}"
    elif [[ "$url" =~ /([^/]+)\.(jpg|jpeg|png|webp) ]]; then
        local content_id="${BASH_REMATCH[1]}"
    else
        echo "SKIP: 无法提取ID: $url" >> "$LOG_FILE"
        return 1
    fi
    
    # 确定扩展名
    local ext=".jpg"
    if [[ "$url" == *.webp ]]; then ext=".webp"; fi
    if [[ "$url" == *.png ]]; then ext=".png"; fi
    
    local file_path="$CACHE_DIR/${content_id}${ext}"
    
    # 检查是否已存在
    if [[ -f "$file_path" ]]; then
        echo "SKIP: 已存在: $content_id" >> "$LOG_FILE"
        return 0
    fi
    
    # 确定Referer
    local referer="https://movie.douban.com/"
    if [[ "$url" == *manmankan.com* ]]; then
        referer="https://www.manmankan.com/"
    fi
    
    # 下载图片
    curl -s -o "$file_path" \
        -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
        -H "Referer: $referer" \
        -H "Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8" \
        --connect-timeout 10 \
        --max-time 30 \
        "$url"
    
    if [[ $? -eq 0 ]] && [[ -f "$file_path" ]] && [[ -s "$file_path" ]]; then
        echo "OK: $content_id" >> "$LOG_FILE"
        return 0
    else
        rm -f "$file_path"
        echo "FAIL: $content_id" >> "$LOG_FILE"
        return 1
    fi
}

# 主流程
echo "开始下载海报..."
echo "日志: $LOG_FILE"
echo "缓存目录: $CACHE_DIR"

# 如果有参数，从文件读取；否则从stdin读取
if [[ $# -gt 0 ]]; then
    cat "$1" | while read -r url; do
        [[ -z "$url" || "$url" == \#* ]] && continue
        download_poster "$url"
        sleep 0.1  # 限速，避免被封
    done
else
    while read -r url; do
        [[ -z "$url" || "$url" == \#* ]] && continue
        download_poster "$url"
        sleep 0.1
    done
fi

# 统计结果
total=$(grep -c "^" "$LOG_FILE" 2>/dev/null || echo 0)
ok=$(grep -c "^OK:" "$LOG_FILE" 2>/dev/null || echo 0)
fail=$(grep -c "^FAIL:" "$LOG_FILE" 2>/dev/null || echo 0)
skip=$(grep -c "^SKIP:" "$LOG_FILE" 2>/dev/null || echo 0)

echo ""
echo "下载完成:"
echo "  总计: $total"
echo "  成功: $ok"
echo "  失败: $fail"
echo "  跳过: $skip"
