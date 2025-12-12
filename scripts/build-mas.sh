#!/bin/bash
set -e

echo "Loading .env..."
# [ -f .env ] && export $(grep -v '^#' .env | xargs)

source .env


echo "Finding MAS certificates..."
APP_CERT=$(security find-identity -v -p codesigning | grep '3rd Party Mac Developer Application:' | head -n1 | grep -o '"[^"]*"$' | tr -d '"')
INST_CERT=$(security find-identity -v | grep '3rd Party Mac Developer Installer:' | head -n1 | grep -o '"[^"]*"$' | tr -d '"')

if [ -z "$APP_CERT" ]; then
  echo "ERROR: 3rd Party Mac Developer Application certificate NOT found!"
  echo "Run: security find-identity -v -p codesigning"
  exit 1
fi

echo "Using Application certificate: $APP_CERT"
echo "Using Installer certificate: ${INST_CERT:-NOT FOUND}"

# THE ONLY VARIABLES THAT WORK FOR MAS IN 2025
export CSC_IDENTITY_AUTO_DISCOVERY=false
export APPLE_APPLICATION_IDENTITY="$APP_CERT"
export APPLE_INSTALLER_IDENTITY="$INST_CERT"

# Build TypeScript
npm run build

# Clean previous MAS builds to avoid permission issues
echo "Cleaning previous MAS builds..."
# Force remove with proper permissions
if [ -d "dist-app/mas-universal" ]; then
  chmod -R u+w dist-app/mas-universal 2>/dev/null || true
  rm -rf dist-app/mas-universal
fi
if [ -d "dist-app/mas-arm64" ]; then
  chmod -R u+w dist-app/mas-arm64 2>/dev/null || true
  rm -rf dist-app/mas-arm64
fi
if [ -d "dist-app/mas-x64" ]; then
  chmod -R u+w dist-app/mas-x64 2>/dev/null || true
  rm -rf dist-app/mas-x64
fi
# Also clean temp directories
rm -rf dist-app/mas-universal-*-temp 2>/dev/null || true
echo "   Cleaned"

# FINAL BUILD COMMAND — Build universal by default (recommended for App Store)
# Use --dir=false to create a package, not just a directory
if [ "$1" = "universal" ] || [ -z "$1" ]; then
  echo "Building universal binary (arm64 + x86_64)..."
  electron-builder build --mac mas:universal --dir=false --config.compression=maximum
elif [ "$1" = "arm64" ]; then
  echo "Building ARM64 only..."
  electron-builder build --mac mas:arm64 --dir=false --config.compression=maximum
elif [ "$1" = "x64" ]; then
  echo "Building x64 only..."
  electron-builder build --mac mas:x64 --dir=false --config.compression=maximum
else
  echo "Building universal binary (default)..."
  electron-builder build --mac mas:universal --dir=false --config.compression=maximum
fi

echo ""
echo "=========================================="
echo "✅ Build Complete!"
echo "=========================================="
echo ""

# Find the actual package file
ACTUAL_PKG=$(find dist-app -name "BrewMate-*-*.pkg" -type f | grep -E "(universal|arm64|x64)" | sort -r | head -1)
if [ -n "$ACTUAL_PKG" ]; then
  PKG_SIZE=$(du -h "$ACTUAL_PKG" | cut -f1)
  echo "📦 Package: $ACTUAL_PKG"
  echo "   Size: $PKG_SIZE"
  echo ""
  echo "Recommended workflow:"
  echo "  1. Test locally:     npm run test:local"
  echo "  2. Validate:         npm run pre-submit"
  echo "  3. Submit to App Store: npm run submit"
  echo ""
  echo "Or manually:"
  echo "  • Validate: npm run pre-submit"
  echo "  • Open in Transporter: open -a Transporter \"$ACTUAL_PKG\""
else
  echo "⚠️  Package not found in expected location"
  echo ""
  echo "Search for package:"
  echo "  find dist-app -name '*.pkg'"
fi
echo ""