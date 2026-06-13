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

# ── 1. Site Reachable ──
echo "── 1. Site Reachable ──"

HTTP_CODE=$(curl -so /dev/null -w "%{http_code}" --max-time 15 "$BASE_URL/" 2>&1 || echo "000")
# 307 = redirect to login, 403 = WAF/rate-limit (expected from CI), 200 = public homepage
if [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "200" ]; then
  check "Homepage" "ok"
elif [ "$HTTP_CODE" = "000" ]; then
  check "Homepage" "warn" "Connection timeout / DNS failure (network issue)"
else
  check "Homepage" "fail" "HTTP $HTTP_CODE"
fi

# ── 2. Video Proxy Routes ──
echo ""
echo "── 2. Video Proxy Routes ──"

RESP=$(curl -sI --max-time 10 "$BASE_URL/api/proxy/m3u8?url=https%3A%2F%2Ftest-streams.mux.dev%2Fx36xhzz%2Fx36xhzz.m3u8" 2>&1)
HTTP_CODE=$(echo "$RESP" | grep "HTTP/" | awk '{print $2}')
# Proxy returns 200 (success), 403 (CDN blocked - proxy works but CDN refuses), other = broken
if [ "$HTTP_CODE" = "200" ]; then
  check "M3U8 Proxy" "ok"
elif [ "$HTTP_CODE" = "403" ]; then
  check "M3U8 Proxy" "warn" "HTTP 403 (proxy works, CDN blocked the request)"
else
  check "M3U8 Proxy" "fail" "HTTP $HTTP_CODE"
fi

if echo "$RESP" | grep -qi "access-control-allow-origin:\s*\*"; then
  check "M3U8 CORS" "ok"
else
  check "M3U8 CORS" "warn" "Missing Access-Control-Allow-Origin: *"
fi

RESP=$(curl -sI --max-time 10 "$BASE_URL/api/proxy/segment?url=https%3A%2F%2Ftest-streams.mux.dev%2Fx36xhzz%2Furl_0%2F193039199_mp4_h264_aac_hd_7.m3u8" 2>&1)
HTTP_CODE=$(echo "$RESP" | grep "HTTP/" | awk '{print $2}')
if [ "$HTTP_CODE" = "200" ]; then
  check "Segment Proxy" "ok"
elif [ "$HTTP_CODE" = "403" ]; then
  check "Segment Proxy" "warn" "HTTP 403 (proxy via CF edge working, CDN blocked)"
else
  check "Segment Proxy" "fail" "HTTP $HTTP_CODE"
fi

if echo "$RESP" | grep -qi "^server:\s*cloudflare"; then
  check "Via Cloudflare Edge" "ok"
else
  check "Via Cloudflare Edge" "warn" "Not served by Cloudflare edge"
fi

# ── 3. M3U8 Content Rewrite (only when 200) ──
echo ""
echo "── 3. M3U8 Content Rewrite ──"

if [ "$HTTP_CODE" = "200" ]; then
  CONTENT=$(curl -s --max-time 10 "$BASE_URL/api/proxy/m3u8?url=https%3A%2F%2Ftest-streams.mux.dev%2Fx36xhzz%2Fx36xhzz.m3u8" 2>&1)
  if echo "$CONTENT" | grep -q "api/proxy/m3u8"; then
    check "M3U8 URL Rewriting" "ok"
  else
    check "M3U8 URL Rewriting" "fail" "No /api/proxy/m3u8 URLs in output"
  fi
  if echo "$CONTENT" | grep -q "api/proxy/segment"; then
    check "M3U8 Segment Rewriting" "ok"
  else
    check "M3U8 Segment Rewriting" "warn" "No segment URLs (may be master playlist only)"
  fi
  if echo "$CONTENT" | grep -q "^http:"; then
    check "M3U8 Protocol" "warn" "Using http:// instead of https://"
  else
    check "M3U8 Protocol" "ok"
  fi
else
  check "M3U8 URL Rewriting" "warn" "Skipped (proxy returned $HTTP_CODE)"
  check "M3U8 Segment Rewriting" "warn" "Skipped"
  check "M3U8 Protocol" "warn" "Skipped"
fi

# ── 4. Code Quality Checks ──
echo ""
echo "── 4. Code Quality ──"

if grep -q 'URI="' src/app/api/proxy/m3u8/route.ts 2>/dev/null; then
  check "URI= Attribute Handling" "ok"
else
  check "URI= Attribute Handling" "fail" "Missing URI= extraction"
fi

if grep -q 'substituteVariables' src/app/api/proxy/m3u8/route.ts 2>/dev/null; then
  check "VAR Substitution" "ok"
else
  check "VAR Substitution" "fail" "Missing substituteVariables"
fi

if grep "filterInvalidSources.*length.*===.*0" src/app/play/page.tsx 2>/dev/null; then
  check "Source Loop Protection" "ok"
else
  check "Source Loop Protection" "fail" "Missing filterInvalidSources check"
fi

if grep -q "ADULT_KEYWORDS" src/app/play/hooks/useSourceSearch.ts 2>/dev/null || grep -q "ADULT_KEYWORDS" src/app/play/page.tsx 2>/dev/null; then
  check "Adult Filter" "ok"
else
  check "Adult Filter" "fail" "Missing ADULT_KEYWORDS"
fi

if grep -q "_reload=\${" src/components/VideoCard.tsx 2>/dev/null; then
  check "Poster _reload Param" "ok"
else
  check "Poster _reload Param" "fail" "Missing _reload timestamp in router.push URLs"
fi

if grep -q "'/download/" public/sw.js 2>/dev/null; then
  check "SW Download Feature" "ok"
else
  check "SW Download Feature" "fail" "Missing /download/ pattern in sw.js"
fi

# ── 5. CI/CD Files ──
echo ""
echo "── 5. CI/CD Configuration ──"

[ -f ".github/workflows/docker-image.yml" ] && check "Docker Build CI" "ok" || check "Docker Build CI" "fail"
[ -f ".github/workflows/deploy.yml" ] && check "Deploy CI" "ok" || check "Deploy CI" "fail"
[ -f ".github/workflows/deploy-worker.yml" ] && check "Worker Deploy CI" "ok" || check "Worker Deploy CI" "fail"
[ -f ".github/workflows/health-check.yml" ] && check "Health Check CI" "ok" || check "Health Check CI" "fail"
[ -f "wrangler.toml" ] && check "Wrangler Config" "ok" || check "Wrangler Config" "warn" "No wrangler.toml"

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
