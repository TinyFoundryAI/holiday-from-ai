#!/usr/bin/env bash
# Build a clean Chrome Web Store upload ZIP from the extension/ folder.
# Excludes dev-only files (image/audio fetch scripts, attributions optional).
# Output: dist/holiday-from-ai-<version>.zip

set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(python3 -c "import json; print(json.load(open('extension/manifest.json'))['version'])")
OUT_DIR="dist"
OUT_FILE="$OUT_DIR/holiday-from-ai-$VERSION.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

# Exclude dev scripts + OS cruft. Keep attribution .md files (required by CC licenses).
cd extension
zip -r "../$OUT_FILE" . \
  -x "*.DS_Store" \
  -x "**/__pycache__/*" \
  -x "images/_fetch.py" \
  -x "icons/generate.py" \
  >/dev/null

cd ..
size_kb=$(du -k "$OUT_FILE" | awk '{print $1}')
echo "built $OUT_FILE (${size_kb} KB)"
echo "upload this file at https://chrome.google.com/webstore/devconsole"
