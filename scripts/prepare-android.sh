#!/usr/bin/env bash
# Prepares the Android Capacitor project from a dedicated SPA build.
#
# - Builds a static SPA via vite.config.capacitor.ts (output: dist/android/).
# - Falls back to hoisting index.html if it ends up in a nested folder
#   (different Vite versions handle rollup `input` paths slightly differently).
# - Validates the final layout before invoking Capacitor.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

LOGO_URL="${TEMPOKEY_LOGO_URL:-https://tempokey.lovable.app/__l5e/assets-v1/8d9af5cd-e723-4411-acf4-24e5008f2204/tempokey-logo.png}"
WEB_DIR="dist/android"
RES_DIR="resources"

echo "▶ Installing Capacitor toolchain (idempotent)…"
npm install --no-audit --no-fund --save-dev \
  @capacitor/cli@^6 \
  @capacitor/assets@^3 >/dev/null
npm install --no-audit --no-fund --save \
  @capacitor/core@^6 \
  @capacitor/android@^6 \
  @capacitor/splash-screen@^6 \
  @capacitor/status-bar@^6 \
  @capacitor/app@^6 \
  @capacitor/keyboard@^6 \
  @capacitor/filesystem@^6 >/dev/null

echo "▶ Building static SPA for WebView (vite.config.capacitor.ts)…"
rm -rf "$WEB_DIR"
npx vite build --config vite.config.capacitor.ts

# Hoist index.html if Vite emitted it inside a nested subfolder.
if [ ! -f "$WEB_DIR/index.html" ]; then
  NESTED=$(find "$WEB_DIR" -maxdepth 3 -type f -name "index.html" | head -n1 || true)
  if [ -n "$NESTED" ]; then
    NEST_DIR=$(dirname "$NESTED")
    echo "▶ Hoisting $NESTED → $WEB_DIR/index.html"
    cp "$NESTED" "$WEB_DIR/index.html"
    # Move sibling assets too if they live next to the nested index.html
    if [ "$NEST_DIR" != "$WEB_DIR" ] && [ -d "$NEST_DIR" ]; then
      shopt -s dotglob nullglob
      for f in "$NEST_DIR"/*; do
        base=$(basename "$f")
        [ "$base" = "index.html" ] && continue
        [ -e "$WEB_DIR/$base" ] && continue
        mv "$f" "$WEB_DIR/"
      done
      shopt -u dotglob nullglob
      rmdir "$NEST_DIR" 2>/dev/null || true
    fi
  fi
fi

if [ ! -f "$WEB_DIR/index.html" ]; then
  echo "❌ Android SPA build did not produce $WEB_DIR/index.html" >&2
  echo "Tree:" >&2
  find "$WEB_DIR" -maxdepth 3 -type f >&2 || true
  exit 1
fi
echo "✓ $WEB_DIR/index.html present"

# Sanity check: the built index.html must reference real bundled assets.
if ! grep -qE 'src="\.?/?assets/' "$WEB_DIR/index.html"; then
  echo "❌ index.html does not reference any bundled asset — black screen guaranteed." >&2
  cat "$WEB_DIR/index.html" >&2
  exit 1
fi
echo "✓ index.html links bundled assets"

echo "▶ Preparing icon & splash sources…"
mkdir -p "$RES_DIR"
# Use the committed official logo when present, otherwise download from CDN.
if [ ! -f "$RES_DIR/icon.png" ]; then
  curl -L --silent --fail "$LOGO_URL" -o "$RES_DIR/icon.png"
fi
if [ ! -f "$RES_DIR/splash.png" ]; then
  cp -f "$RES_DIR/icon.png" "$RES_DIR/splash.png"
fi
cp -f "$RES_DIR/icon.png" "android-resources/logo.png" 2>/dev/null || true

echo "▶ Adding Android platform (if missing)…"
if [ ! -d "android" ]; then
  npx cap add android
fi

echo "▶ Generating launcher icons, adaptive icon & splash…"
npx @capacitor/assets generate --android \
  --iconBackgroundColor "#FFFFFF" \
  --iconBackgroundColorDark "#FFFFFF" \
  --splashBackgroundColor "#FFFFFF" \
  --splashBackgroundColorDark "#FFFFFF" || {
    echo "⚠ @capacitor/assets failed; continuing with platform defaults." >&2
  }

echo "▶ Syncing Capacitor…"
npx cap sync android

echo "✅ Android project prepared at ./android (webDir=$WEB_DIR)"
