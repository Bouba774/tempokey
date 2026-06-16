#!/usr/bin/env bash
# Prepares the Android Capacitor project.
#
# Pipeline:
#   1. Install Capacitor toolchain (idempotent)
#   2. Build a dedicated SPA bundle into dist/android/ via vite.android.config.mjs
#   3. Flatten the bundle so index.html sits at dist/android/index.html
#      (Vite preserves the input HTML path, so the raw output is
#       dist/android/android-template/index.html — we move it up.)
#   4. Fetch logo + generate Android icons / splash via @capacitor/assets
#   5. Add Android platform (if missing) + cap sync
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

LOGO_URL="${TEMPOKEY_LOGO_URL:-https://tempokey.lovable.app/__l5e/assets-v1/eafb172a-82c5-4678-b411-cb277431b9af/tempokey-logo.png}"
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
  @capacitor/filesystem@^6 >/dev/null

echo "▶ Building dedicated Android SPA bundle → ${WEB_DIR}…"
rm -rf "$WEB_DIR"
npm run build:android

# Flatten: Vite emits dist/android/android-template/index.html because the
# input HTML lives at android-template/index.html. Move everything up so
# Capacitor finds dist/android/index.html.
if [ ! -f "$WEB_DIR/index.html" ] && [ -f "$WEB_DIR/android-template/index.html" ]; then
  echo "▶ Flattening dist/android/android-template → dist/android"
  # Move (or merge) everything from the nested folder up one level.
  shopt -s dotglob nullglob
  mv "$WEB_DIR/android-template/"* "$WEB_DIR/" || true
  shopt -u dotglob nullglob
  rmdir "$WEB_DIR/android-template" 2>/dev/null || true
fi

if [ ! -f "$WEB_DIR/index.html" ]; then
  echo "❌ Android index.html missing after build" >&2
  echo "── Tree of $WEB_DIR ──" >&2
  find "$WEB_DIR" -maxdepth 4 -type f >&2 || true
  echo "── Any index.html found ──" >&2
  find "$WEB_DIR" -name 'index.html' >&2 || true
  exit 1
fi
echo "  ✓ index.html present at $WEB_DIR/index.html"
echo "  ✓ asset count: $(find "$WEB_DIR" -type f | wc -l)"

echo "▶ Preparing icon & splash sources…"
mkdir -p "$RES_DIR"
if [ ! -f "$RES_DIR/icon.png" ]; then
  curl -L --silent --fail "$LOGO_URL" -o "$RES_DIR/icon.png"
fi
cp -f "$RES_DIR/icon.png" "$RES_DIR/splash.png"
mkdir -p android-resources
cp -f "$RES_DIR/icon.png" "android-resources/logo.png" || true

echo "▶ Adding Android platform (if missing)…"
if [ ! -d "android" ]; then
  npx cap add android
fi

echo "▶ Generating launcher icons, adaptive icon & splash…"
npx @capacitor/assets generate --android \
  --iconBackgroundColor "#0A0D14" \
  --iconBackgroundColorDark "#0A0D14" \
  --splashBackgroundColor "#0A0D14" \
  --splashBackgroundColorDark "#0A0D14" || {
    echo "⚠ @capacitor/assets failed; continuing with platform defaults." >&2
  }

echo "▶ Installing native FolderPicker plugin (Storage Access Framework)…"
PKG_DIR="android/app/src/main/java/app/lovable/tempokey"
PLUGIN_DIR="$PKG_DIR/plugins"
mkdir -p "$PLUGIN_DIR"
cp -f android-resources/native-plugin/FolderPickerPlugin.kt "$PLUGIN_DIR/FolderPickerPlugin.kt"
# Replace the generated MainActivity so the plugin is registered at startup.
cp -f android-resources/native-plugin/MainActivity.kt "$PKG_DIR/MainActivity.kt"
# Older Capacitor templates emit a Java MainActivity — remove it to avoid duplicate classes.
rm -f "$PKG_DIR/MainActivity.java"

echo "▶ Syncing Capacitor…"
npx cap sync android

echo "✅ Android project prepared at ./android"
