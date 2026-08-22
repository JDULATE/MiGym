#!/usr/bin/env bash
# MiGym restore — puts a backup archive back into ./data.
#
#   scripts/restore.sh <backup.tar.gz> [--wipe]
#
# Without --wipe the archive is extracted over ./data (existing files it contains are
# replaced; extra local files are kept). With --wipe, ./data is cleared first so the
# restore is exact. Stop the stack first for a clean state:
#   docker compose stop api web
set -euo pipefail

ARCHIVE="${1:-}"
WIPE="${2:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

[ -f "$ARCHIVE" ] || { echo "Usage: scripts/restore.sh <migym-data-*.tar.gz> [--wipe]"; exit 1; }

if [ "$WIPE" = "--wipe" ]; then
  echo "Wiping $ROOT/data ..."
  rm -rf "$ROOT/data"
fi

tar -xzf "$ARCHIVE" -C "$ROOT"
echo "Restored into $ROOT/data:"
ls -la "$ROOT/data"
echo ""
echo "Start the stack:  docker compose up -d"
echo "Verify:           curl -fsS http://localhost:${WEB_PORT:-8080}/api/health"
