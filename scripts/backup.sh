#!/usr/bin/env bash
# MiGym backup — archives ./data (the ONLY durable state) into a timestamped tar.gz.
#
#   scripts/backup.sh [target-dir]
#
# Default target: ./backups next to the compose file. Keeps the last KEEP=14 backups.
# Safe to run while the stack is up: per-file writes in the API are atomic
# (tmp+rename), so copying may catch a file mid-rename at worst — run during low
# traffic or stop the stack for a guaranteed-consistent archive.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/data"
DEST="${1:-$ROOT/backups}"
KEEP=14

[ -d "$DATA" ] || { echo "No $DATA — nothing to back up."; exit 1; }
mkdir -p "$DEST"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/migym-data-$STAMP.tar.gz"
tar -czf "$OUT" -C "$ROOT" data

# prune old backups, keep the newest $KEEP
ls -1t "$DEST"/migym-data-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm --

echo "Backup written: $OUT ($(du -h "$OUT" | cut -f1))"
echo "Snapshots inside data/snapshots are included; media/ is re-downloadable and skipped."
