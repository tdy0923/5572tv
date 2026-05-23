---
description: Run health check on production or development server
agent: build-deploy
---

# Health Check

Run the comprehensive health check script against the production site.

## Usage

```
/health-check
/health-check https://dev.5572.net
```

## What it checks

1. Site Availability (homepage, API)
2. Video Proxy Routes (M3U8, segment, CORS headers)
3. M3U8 Content Rewriting (URLs properly proxied)
4. Douban Integration (search API)
5. TypeScript & Code Quality (URI= handling, source loop, adult filter)
6. Service Worker (download URL format)
7. CI/CD Configuration (workflows, wrangler)
8. Poster \_reload parameter

## On Failure

- Red ❌ items must be fixed before deployment
- Yellow ⚠️ items should be reviewed
- Run `scripts/health-check.sh` locally to reproduce
