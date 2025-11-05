#!/bin/bash
# Convert icon-raw.png to .icns file for macOS

ICON_SOURCE=""
if [ -f "assets/icon-raw.png" ]; then
  ICON_SOURCE="assets/icon-raw.png"
elif [ -f "src/assets/icon-raw.png" ]; then
  ICON_SOURCE="src/assets/icon-raw.png"
else
  echo "Error: icon-raw.png not found"
  exit 1
fi

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

