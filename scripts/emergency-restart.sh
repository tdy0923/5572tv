#!/bin/bash
# Emergency server restart script
# Run this on the server via rescue mode SSH
set -e

echo "=== 1. Exit rescue mode, mount real disk ==="
# Detect the real root disk (not the rescue ramdisk)
REAL_DISK=$(lsblk -ndo PKNAME $(findmnt -n -o SOURCE /) 2>/dev/null || echo "")
if [ -n "$REAL_DISK" ]; then
    echo "Found real disk: /dev/$REAL_DISK"
    # Mount real root filesystem
    mkdir -p /mnt/real_root
    mount /dev/${REAL_DISK}1 /mnt/real_root 2>/dev/null || mount /dev/${REAL_DISK}p1 /mnt/real_root 2>/dev/null || mount /dev/${REAL_DISK} /mnt/real_root 2>/dev/null || true
    if mountpoint -q /mnt/real_root; then
        echo "Real root mounted at /mnt/real_root"
        # Check if docker data is there
        ls /mnt/real_root/var/lib/docker/ 2>/dev/null && echo "Docker data found"
    else
        echo "Could not mount real disk. Listing available disks:"
        lsblk -f
    fi
else
    echo "No real disk found, running from live system"
    lsblk -f
fi

echo ""
echo "=== 2. Check Docker status ==="
systemctl start docker 2>/dev/null || service docker start 2>/dev/null || dockerd &>/dev/null &
sleep 3
docker ps -a 2>/dev/null || echo "Docker not available"

echo ""
echo "=== 3. System info ==="
free -h
df -h
cat /proc/cpuinfo | grep "model name" | head -1

echo ""
echo "=== Done. Review the output above ==="
echo "If Docker is running and container 5572tv-core exists, restart it with:"
echo "  docker start 5572tv-core"
echo "If container is missing, re-run the deploy from GitHub Actions."
