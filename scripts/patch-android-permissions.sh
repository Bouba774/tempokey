#!/usr/bin/env bash
# Patch the freshly-generated Android project with TempoKey's native permission
# layer: manifest entries + custom Capacitor plugin + MainActivity registration.
#
# Idempotent — safe to run on every CI build after `cap add android`.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

APP_ID_PATH="app/lovable/tempokey"
ANDROID_DIR="android"
JAVA_DIR="$ANDROID_DIR/app/src/main/java/$APP_ID_PATH"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
SRC="android-resources/native"

if [ ! -d "$ANDROID_DIR" ]; then
  echo "❌ android/ not found — run 'npx cap add android' first." >&2
  exit 1
fi

echo "▶ Installing native Java sources into $JAVA_DIR…"
mkdir -p "$JAVA_DIR"
cp -f "$SRC/TempoKeyPermissions.java"  "$JAVA_DIR/TempoKeyPermissions.java"
cp -f "$SRC/TempoKeyFolderPicker.java" "$JAVA_DIR/TempoKeyFolderPicker.java"
cp -f "$SRC/MainActivity.java"         "$JAVA_DIR/MainActivity.java"
echo "  ✓ TempoKeyPermissions.java"
echo "  ✓ TempoKeyFolderPicker.java (SAF folder picker)"
echo "  ✓ MainActivity.java (plugins registered)"

echo "▶ Patching AndroidManifest.xml with audio permissions…"
if grep -q "READ_MEDIA_AUDIO" "$MANIFEST"; then
  echo "  ✓ permissions already present (skipping)"
else
  PERMS_BLOCK=$(grep -v '^\s*<!--' "$SRC/AndroidManifest.permissions.xml" | grep -v '^\s*-->' || true)
  # Insert the permissions block right after the opening <manifest ...> tag.
  python3 - "$MANIFEST" <<'PY'
import sys, re, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text(encoding="utf-8")
perms = """    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission
        android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
"""
new = re.sub(
    r"(<manifest\b[^>]*>\s*\n)",
    lambda m: m.group(1) + perms,
    src,
    count=1,
)
p.write_text(new, encoding="utf-8")
PY
  echo "  ✓ permissions injected"
fi

echo "✅ Android permissions patch applied."
