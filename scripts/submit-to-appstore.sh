#!/bin/bash
# Script to submit MAS package to App Store via Xcode Transporter
# This is the recommended way to submit Electron apps to the Mac App Store

set -e

echo "=========================================="
echo "App Store Submission Helper"
echo "=========================================="
echo ""

# Find the package
PKG_DIR="dist-app/mas-universal"
PKG_PATH=$(find "$PKG_DIR" -name "BrewMate-*-*.pkg" -type f | sort -r | head -1)

if [ -z "$PKG_PATH" ] || [ ! -f "$PKG_PATH" ]; then
  echo "❌ ERROR: Package not found!"
  echo ""
  echo "Please build the package first:"
  echo "  npm run build:mas"
  echo ""
  exit 1
fi

echo "📦 Package found: $PKG_PATH"
echo ""

# Get package info
PKG_NAME=$(basename "$PKG_PATH")
PKG_SIZE=$(du -h "$PKG_PATH" | cut -f1)

echo "Package Details:"
echo "  Name: $PKG_NAME"
echo "  Size: $PKG_SIZE"
echo ""

# Verify package exists and is readable
if [ ! -r "$PKG_PATH" ]; then
  echo "❌ ERROR: Cannot read package file"
  exit 1
fi

echo "=========================================="
echo "Opening in Xcode Transporter"
echo "=========================================="
echo ""
echo "The Transporter app will open with your package ready to upload."
echo ""
echo "Steps in Transporter:"
echo "  1. Sign in with your Apple ID"
echo "  2. Click '+' to add your package"
echo "  3. Select: $PKG_NAME"
echo "  4. Click 'Deliver' to upload"
echo ""

# Try to open with Transporter app
if [ -d "/Applications/Transporter.app" ]; then
  echo "Opening Transporter app..."
  open -a Transporter "$PKG_PATH"
  echo ""
  echo "✅ Transporter opened with your package"
elif command -v xcrun &> /dev/null; then
  echo "Transporter app not found in /Applications"
  echo ""
  echo "Alternative: Use command line upload:"
  echo "  xcrun altool --upload-app --file \"$PKG_PATH\" --type macos --username YOUR_APPLE_ID --password YOUR_APP_SPECIFIC_PASSWORD"
  echo ""
  echo "Or download Transporter from:"
  echo "  https://apps.apple.com/us/app/transporter/id1450874784"
  echo ""
  echo "Opening package location in Finder..."
  open -R "$PKG_PATH"
else
  echo "⚠️  Transporter not found"
  echo ""
  echo "Please install Transporter from the Mac App Store:"
  echo "  https://apps.apple.com/us/app/transporter/id1450874784"
  echo ""
  echo "Or use command line:"
  echo "  xcrun altool --upload-app --file \"$PKG_PATH\" --type macos"
  echo ""
  echo "Opening package location in Finder..."
  open -R "$PKG_PATH"
fi

echo ""
echo "=========================================="
echo "Next Steps After Upload"
echo "=========================================="
echo ""
echo "1. Monitor upload progress in Transporter"
echo "2. Check App Store Connect for processing status"
echo "3. Once processed, add to TestFlight (optional)"
echo "4. Submit for App Store review"
echo ""
echo "Check status: npm run check:testflight"
echo ""


