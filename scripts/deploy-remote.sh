#!/usr/bin/env bash
set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/tdy0923/5572tv:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-5572tv-core}"
NETWORK_NAME="${NETWORK_NAME:-5572tv-net}"

docker pull "$IMAGE"

docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

docker run -d \
  --name "$CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  -p 3000:3000 \
  -e USERNAME='Danny' \
  -e PASSWORD='Danny0923' \
  -e SITE_BASE='https://www.5572.net' \
  -e NEXT_PUBLIC_SITE_NAME='5572影视' \
  -e NEXT_PUBLIC_STORAGE_TYPE='kvrocks' \
  -e KVROCKS_URL='redis://kvrocks:6666' \
  --restart unless-stopped \
  "$IMAGE"

docker image prune -f
