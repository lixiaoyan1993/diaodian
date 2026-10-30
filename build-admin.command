#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$ROOT_DIR/release/$STAMP"
OUT_DIR="$RELEASE_DIR/admin-web"
ARCHIVE_PATH="$ROOT_DIR/release/diaodian-admin-$STAMP.tar.gz"
TARGET_PATH="/www/wwwroot/diaodian/admin"

mkdir -p "$OUT_DIR"

echo "==> Building admin package"
cd "$ROOT_DIR/admin"
npx -y node@20 node_modules/vite/bin/vite.js build --config vite.config.build.mjs

echo "==> Collecting files"
cd "$ROOT_DIR"
rsync -a admin/dist/ "$OUT_DIR/"

echo "==> Creating archive"
tar -czf "$ARCHIVE_PATH" -C "$RELEASE_DIR" admin-web

echo ""
echo "Admin package ready:"
echo "$ARCHIVE_PATH"
echo "Upload to:"
echo "$TARGET_PATH"
