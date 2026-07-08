#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   export SITE_USERNAME=myuser SITE_PASSWORD=mypass KVROCKS_URL=redis://:pass@kvrocks:6666
#   ./scripts/deploy-remote.sh
#
# Required env vars: SITE_USERNAME, SITE_PASSWORD, KVROCKS_URL
# Optional: SITE_BASE, GROQ_API_KEY, NVIDIA_API_KEY

IMAGE="${IMAGE:-ghcr.io/tdy0923/5572tv:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-5572tv-core}"
NETWORK_NAME="${NETWORK_NAME:-5572tv-net}"

: "${SITE_USERNAME:?Must set SITE_USERNAME}"
: "${SITE_PASSWORD:?Must set SITE_PASSWORD}"
: "${KVROCKS_URL:?Must set KVROCKS_URL}"

docker pull "$IMAGE"

docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

docker run -d \
  --name "$CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  -p 3000:3000 \
  -e USERNAME="$SITE_USERNAME" \
  -e PASSWORD="$SITE_PASSWORD" \
  -e SITE_BASE="${SITE_BASE:-https://www.5572.net}" \
  -e NEXT_PUBLIC_SITE_NAME='5572影视' \
  -e NEXT_PUBLIC_STORAGE_TYPE='kvrocks' \
  -e KVROCKS_URL="$KVROCKS_URL" \
  -e GROQ_API_KEY="${GROQ_API_KEY:-}" \
  -e NVIDIA_API_KEY="${NVIDIA_API_KEY:-}" \
  --restart unless-stopped \
  "$IMAGE"

docker image prune -f
