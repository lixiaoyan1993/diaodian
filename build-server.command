#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$ROOT_DIR/release/$STAMP"
OUT_DIR="$RELEASE_DIR/server-runtime"
ARCHIVE_PATH="$ROOT_DIR/release/diaodian-server-$STAMP.tar.gz"
TARGET_PATH="/www/wwwroot/diaodian/server"

mkdir -p "$OUT_DIR"

echo "==> Building server package"
cd "$ROOT_DIR/server"
npx -y node@20 node_modules/typescript/bin/tsc -p tsconfig.json

echo "==> Collecting files"
cd "$ROOT_DIR"
rsync -a server/dist/ "$OUT_DIR/dist/"
rsync -a server/prisma/ "$OUT_DIR/prisma/"
cp server/package.json server/package-lock.json server/.env "$OUT_DIR/"

echo "==> Creating archive"
tar -czf "$ARCHIVE_PATH" -C "$RELEASE_DIR" server-runtime

echo ""
echo "Server package ready:"
echo "$ARCHIVE_PATH"
echo "Upload to:"
echo "$TARGET_PATH"
echo ""
echo "After upload, on server run:"
echo "cd $TARGET_PATH && npm install --omit=dev && node dist/app.js"

