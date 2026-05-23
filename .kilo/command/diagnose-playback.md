---
description: Diagnose and fix playback issues step by step
agent: playback-fix
---

# Diagnose Playback

Follow these steps to diagnose and fix playback issues.

## Step 1: Check Console Logs

Ask the user for browser console logs. Look for:

- `⏭️ HEAD 不通` — quickProbe correctly skipping dead sources
- `🚫 已标记源为无效` — source marked as failed
- `❌ 没有更多可用源` — all sources exhausted
- `⚠️ 同一源连续错误超过限制` — loop protection
- `🔄 自动切换到备用源` — source switching working
- `/api/proxy/3000k/hls/mixed.m3u8` 404 — M3U8 rewrite bug
- `🎬 使用豆瓣预告片作为播放源` — trailer fallback working

## Step 2: Run Health Check

Run `/health-check` to verify proxy, M3U8 rewrite, and code integrity.

## Step 3: Test Specific Issues

### Issue: "未找到严格匹配结果" for ALL movies

Check if search API works:

```
curl -sI "$BASE_URL/api/search?q=test" | grep "HTTP/2"
```

401 = auth issue, 200 = search works.

### Issue: 403 on ALL sources

Check if CF Worker is deployed:

```
curl -sI "$BASE_URL/api/proxy/segment?url=test" | grep -i "cf-ray"
```

If cf-ray present, CF Worker is active. Check if routes are correct.

### Issue: Same video for all poster clicks

Check if `_reload` param is in the URL:

```
grep -c '_reload' src/components/VideoCard.tsx
```

Should be >= 4 (one per URL pattern).

## Step 4: Source-Specific Fixes

| Symptom                                        | Fix                                     | File                    |
| ---------------------------------------------- | --------------------------------------- | ----------------------- |
| M3U8 URLs have `http://` instead of `https://` | Referer protocol detection needs fixing | m3u8/route.ts:288-296   |
| quickProbe returns 'ok' for 403                | Use mode: 'cors' with proxy             | play/page.tsx:1674-1693 |
| Source loop on all 403                         | Check fallback retry logic              | play/page.tsx:7157-7164 |
| M3U8 404 on segments                           | URI= attribute extraction               | m3u8/route.ts:377-394   |
