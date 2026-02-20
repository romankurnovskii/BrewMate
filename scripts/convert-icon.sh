#!/bin/bash
# Convert icon-raw.png to .icns file for macOS App Store
# Uses icon-raw.png (non-transparent) for App Store builds

ICON_SOURCE=""
# Check for new icons in assets/ folder first (preferred)
if [ -f "assets/icon-raw.png" ]; then
  ICON_SOURCE="assets/icon-raw.png"
elif [ -f "assets/android-chrome-512x512.png" ]; then
  ICON_SOURCE="assets/android-chrome-512x512.png"
  echo "ℹ️  Using android-chrome-512x512.png as icon source"
elif [ -f "src/assets/icon-raw.png" ]; then
  ICON_SOURCE="src/assets/icon-raw.png"
else
  echo "Error: No suitable icon source found"
  echo "   Looking for: assets/icon-raw.png, assets/android-chrome-512x512.png, or src/assets/icon-raw.png"
  exit 1
fi

echo "Using $ICON_SOURCE for App Store icon (.icns)"

ICONSET_DIR="build/icon.iconset"
mkdir -p "$ICONSET_DIR"

# Generate all required icon sizes
sips -z 16 16     "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_16x16.png"
sips -z 32 32     "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_16x16@2x.png"
sips -z 32 32     "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_32x32.png"
sips -z 64 64     "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_32x32@2x.png"
sips -z 128 128   "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_128x128.png"
sips -z 256 256   "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_128x128@2x.png"
sips -z 256 256   "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_256x256.png"
sips -z 512 512   "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_256x256@2x.png"
sips -z 512 512   "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_512x512.png"
sips -z 1024 1024 "$ICON_SOURCE" --out "${ICONSET_DIR}/icon_512x512@2x.png"

# Create .icns file
iconutil -c icns "$ICONSET_DIR" -o "build/icon.icns"

echo "✓ Created build/icon.icns"

