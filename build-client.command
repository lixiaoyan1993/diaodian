#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$ROOT_DIR/release/$STAMP"
OUT_DIR="$RELEASE_DIR/client-h5"
ARCHIVE_PATH="$ROOT_DIR/release/diaodian-client-h5-$STAMP.tar.gz"
TARGET_PATH="/www/wwwroot/diaodian/h5"

mkdir -p "$OUT_DIR"

echo "==> Building client H5 package"
cd "$ROOT_DIR/client"
npx -y node@20 node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build -p h5

echo "==> Collecting files"
cd "$ROOT_DIR"
rsync -a client/dist/build/h5/ "$OUT_DIR/"

echo "==> Creating archive"
tar -czf "$ARCHIVE_PATH" -C "$RELEASE_DIR" client-h5

echo ""
echo "Client package ready:"
echo "$ARCHIVE_PATH"
echo "Upload to:"
echo "$TARGET_PATH"

