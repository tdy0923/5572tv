#!/usr/bin/env bash
# 5572TV Health Check & Diagnostic
set -e

BASE_URL="${1:-https://www.5572.net}"
PASS=0
FAIL=0
WARN=0

red()   { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow(){ echo -e "\033[33m$1\033[0m"; }

check() {
  local name="$1" result="$2" detail="$3"
  if [ "$result" = "ok" ]; then
    green "  ✅ $name"
    PASS=$((PASS+1))
  elif [ "$result" = "warn" ]; then
    yellow "  ⚠️  $name: $detail"
    WARN=$((WARN+1))
  else
    red "  ❌ $name: $detail"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "╔════════════════════════════════════════╗"
echo "║    5572TV Health Check                ║"
echo "║    $BASE_URL"
echo "╚════════════════════════════════════════╝"
echo ""

# ── 1. Site Availability ──
echo "── 1. Site Availability ──"
HTTP_CODE=$(curl -so /dev/null -w "%{http_code}" "$BASE_URL/" 2>&1 || echo "000")
[ "$HTTP_CODE" = "307" ] && check "Homepage" "ok" || check "Homepage" "fail" "HTTP $HTTP_CODE"

HTTP_CODE=$(curl -so /dev/null -w "%{http_code}" "$BASE_URL/api/server-config" 2>&1 || echo "000")
[ "$HTTP_CODE" = "200" ] && check "Server Config API" "ok" || check "Server Config API" "warn" "HTTP $HTTP_CODE (may need auth)"

# ── 2. Proxy Routes ──
echo ""
echo "── 2. Video Proxy Routes ──"

# M3U8 proxy
RESP=$(curl -sI "$BASE_URL/api/proxy/m3u8?url=https%3A%2F%2Ftest-streams.mux.dev%2Fx36xhzz%2Fx36xhzz.m3u8" 2>&1)
HTTP_CODE=$(echo "$RESP" | grep "HTTP/2" | awk '{print $2}')
[ "$HTTP_CODE" = "200" ] && check "M3U8 Proxy" "ok" || check "M3U8 Proxy" "fail" "HTTP $HTTP_CODE"

# Check CORS headers
if echo "$RESP" | grep -qi "access-control-allow-origin:\s*\*"; then
  check "M3U8 CORS Headers" "ok"
else
  check "M3U8 CORS Headers" "fail" "Missing Access-Control-Allow-Origin: *"
fi

# Segment proxy (CF Worker edge)
RESP=$(curl -sI "$BASE_URL/api/proxy/segment?url=https%3A%2F%2Ftest-streams.mux.dev%2Fx36xhzz%2Furl_0%2F193039199_mp4_h264_aac_hd_7.m3u8" 2>&1)
HTTP_CODE=$(echo "$RESP" | grep "HTTP/2" | awk '{print $2}')
if [ "$HTTP_CODE" = "200" ]; then
  check "Segment Proxy" "ok"
  # Check if served by Cloudflare
  if echo "$RESP" | grep -qi "^server:\s*cloudflare"; then
    check "Segment via Cloudflare" "ok"
  else
    check "Segment via Cloudflare" "warn" "Not served by Cloudflare edge"
  fi
else
  check "Segment Proxy" "fail" "HTTP $HTTP_CODE"
fi

# ── 3. M3U8 Content Rewrite Verification ──
echo ""
echo "── 3. M3U8 Content Rewrite ──"

CONTENT=$(curl -s "$BASE_URL/api/proxy/m3u8?url=https%3A%2F%2Ftest-streams.mux.dev%2Fx36xhzz%2Fx36xhzz.m3u8" 2>&1)
if echo "$CONTENT" | grep -q "api/proxy/m3u8"; then
  check "M3U8 URL Rewriting" "ok"
else
  check "M3U8 URL Rewriting" "fail" "No /api/proxy/m3u8 URLs found"
fi
if echo "$CONTENT" | grep -q "api/proxy/segment"; then
  check "M3U8 Segment Rewriting" "ok"
else
  check "M3U8 Segment Rewriting" "warn" "No segment URLs (may be master playlist)"
fi

# Check HTTP protocol in URLs
if echo "$CONTENT" | grep -q "^http:"; then
  check "M3U8 Protocol (HTTP)" "warn" "Using http:// instead of https://"
else
  check "M3U8 Protocol" "ok"
fi

# ── 4. Douban Integration ──
echo ""
echo "── 4. Douban Integration ──"

RESP=$(curl -s "$BASE_URL/api/douban/search?q=%E5%AE%B6%E4%B8%9A" 2>&1)
if echo "$RESP" | grep -q '"results"'; then
  check "Douban Search API" "ok"
  RESULTS=$(echo "$RESP" | python3 -c "import json,sys;d=json.load(sys.stdin);print(len(d.get('results',[])))" 2>/dev/null || echo "0")
  [ "$RESULTS" -gt "0" ] && check "Douban Search Results" "ok" || check "Douban Search Results" "warn" "Empty results"
else
  check "Douban Search API" "fail" "Response doesn't contain results"
fi

# ── 5. TypeScript & Build Check ──
echo ""
echo "── 5. TypeScript & Build ──"

if [ -f "src/app/api/proxy/m3u8/route.ts" ]; then
  check "M3U8 Route Exists" "ok"

  if grep -q 'URI="' src/app/api/proxy/m3u8/route.ts; then
    check "URI= Attribute Handling" "ok"
  else
    check "URI= Attribute Handling" "fail" "Missing URI= extraction in #EXT-X-STREAM-INF"
  fi

  if grep -q 'substituteVariables' src/app/api/proxy/m3u8/route.ts; then
    check "VAR Substitution" "ok"
  else
    check "VAR Substitution" "fail" "Missing substituteVariables"
  fi
else
  check "M3U8 Route Exists" "fail" "File not found"
fi

if grep -q 'fallbackAutoRetriedRef' src/app/play/page.tsx 2>/dev/null; then
  if grep -q "filterInvalidSources.*length.*===.*0" src/app/play/page.tsx 2>/dev/null; then
    check "Source Loop Protection" "ok"
  else
    check "Source Loop Protection" "fail" "Missing filterInvalidSources check"
  fi
else
  check "Source Loop Protection" "warn" "fallbackAutoRetriedRef not found"
fi

if grep -q 'isAdultContent' src/app/play/page.tsx 2>/dev/null; then
  if grep "ADULT_KEYWORDS" src/app/play/page.tsx -A1 | grep -q "\\^("; then
    check "Adult Filter (^ anchor)" "ok"
  else
    check "Adult Filter (^ anchor)" "fail" "Missing ^ anchor - will over-filter"
  fi
fi

# ── 6. SW & PWA ──
echo ""
echo "── 6. Service Worker ──"

if grep -q "downloadUrl" public/sw.js 2>/dev/null; then
  check "SW Download Feature" "ok"
  SW_DOWNLOAD=$(grep -oP "'/download/\\\$\{token\}" public/sw.js 2>/dev/null)
  [ -n "$SW_DOWNLOAD" ] && check "SW URL Format" "ok" || check "SW URL Format" "fail" "Missing /download/{token} pattern"
else
  check "SW Download Feature" "fail" "downloadUrl not found in sw.js"
fi

# ── 7. CI Configuration ──
echo ""
echo "── 7. CI/CD Configuration ──"

[ -f ".github/workflows/docker-image.yml" ] && check "Docker Build CI" "ok" || check "Docker Build CI" "fail"
[ -f ".github/workflows/deploy.yml" ] && check "Deploy CI" "ok" || check "Deploy CI" "fail"
[ -f ".github/workflows/deploy-worker.yml" ] && check "Worker Deploy CI" "ok" || check "Worker Deploy CI" "fail"
[ -f "wrangler.toml" ] && check "Wrangler Config" "ok" || check "Wrangler Config" "warn" "No wrangler.toml"

# Verify _reload param in VideoCard
if grep -q '_reload=\${' src/components/VideoCard.tsx 2>/dev/null; then
  check "Poster _reload Param" "ok"
else
  check "Poster _reload Param" "fail" "Missing _reload timestamp in router.push URLs"
fi

# ── Summary ──
echo ""
echo "── Summary ──"
echo "  Passed: $PASS"
echo "  Warnings: $WARN"
echo "  Failed: $FAIL"
echo ""

if [ "$FAIL" -gt "0" ]; then
  echo -e "\033[31mSome checks failed. Review above for details.\033[0m"
  exit 1
elif [ "$WARN" -gt "0" ]; then
  echo -e "\033[33mAll critical checks passed. Review warnings.\033[0m"
  exit 0
else
  echo -e "\033[32mAll checks passed.\033[0m"
  exit 0
fi
