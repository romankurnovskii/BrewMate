#!/bin/bash
set -e

# Script to validate Mac App Store package before uploading
# Usage: ./scripts/validate-mas-package.sh [path-to-pkg]

# If path provided as argument, use it; otherwise find the package dynamically
if [ -n "$1" ]; then
  PKG_PATH="$1"
else
  # Package name format: BrewMate-{version}-{arch}.pkg
  PKG_DIR="dist-app/mas-universal"
  
  if [ -d "$PKG_DIR" ]; then
    # Find the most recent .pkg file matching the pattern
    PKG_PATH=$(find "$PKG_DIR" -name "BrewMate-*-*.pkg" -type f | sort -r | head -1)
  fi
  
  if [ -z "$PKG_PATH" ]; then
    PKG_PATH="dist-app/mas-universal/BrewMate.pkg"  # Fallback for error message
  fi
fi

if [ ! -f "$PKG_PATH" ]; then
  echo "ERROR: Package not found at: $PKG_PATH"
  echo ""
  echo "Usage: $0 [path-to-pkg]"
  echo ""
  echo "If no path is provided, the script will look for:"
  echo "  dist-app/mas-universal/BrewMate-*-*.pkg"
  echo ""
  echo "To build the package, run: npm run build:mas:universal"
  exit 1
fi

echo "=========================================="
echo "Validating MAS Package: $PKG_PATH"
echo "=========================================="
echo ""

# 1. Check if package exists and get info
echo "1. Package Info:"
pkgutil --check-signature "$PKG_PATH" || echo "   ⚠️  Package signing check failed"
echo ""

# 2. Validate package structure
echo "2. Package Structure:"
pkgutil --payload-files "$PKG_PATH" | head -20
echo "   ... (showing first 20 files)"
echo ""

# 3. Extract and inspect the .app bundle
echo "3. Extracting and inspecting .app bundle..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract package
pkgutil --expand "$PKG_PATH" "$TEMP_DIR/pkg-expanded"

# MAS packages have the app in a Payload file (cpio+gzip)
PAYLOAD=$(find "$TEMP_DIR/pkg-expanded" -name "Payload" -type f | head -1)

if [ -n "$PAYLOAD" ]; then
  echo "   Extracting Payload..."
  cd "$TEMP_DIR"
  # Payload is gzip-compressed cpio
  gunzip -c "$PAYLOAD" 2>/dev/null | cpio -id 2>/dev/null || true
  APP_BUNDLE=$(find "$TEMP_DIR" -name "*.app" -type d | head -1)
else
  # Try direct find (for other package formats)
  APP_BUNDLE=$(find "$TEMP_DIR/pkg-expanded" -name "*.app" -type d | head -1)
fi

if [ -z "$APP_BUNDLE" ]; then
  echo "   ⚠️  No .app bundle found in package"
else
  echo "   Found app bundle: $APP_BUNDLE"
  
  # Check code signing
  echo ""
  echo "4. Code Signing Verification:"
  codesign -dv --verbose=4 "$APP_BUNDLE" 2>&1 | grep -E "(Authority|Identifier|Format|Signature)" || true
  
  # Verify signature
  echo ""
  echo "5. Signature Verification:"
  if codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE" 2>&1; then
    echo "   ✅ Code signature is valid"
  else
    echo "   ❌ Code signature verification failed"
  fi
  
  # Check entitlements
  echo ""
  echo "6. Entitlements:"
  codesign -d --entitlements - "$APP_BUNDLE" 2>&1 | grep -A 50 "<dict>" || echo "   No entitlements found"
  
  # Get bundle info
  echo ""
  echo "7. Bundle Information:"
  if [ -f "$APP_BUNDLE/Contents/Info.plist" ]; then
    echo "   CFBundleIdentifier: $(defaults read "$APP_BUNDLE/Contents/Info.plist" CFBundleIdentifier 2>/dev/null || echo 'N/A')"
    echo "   CFBundleShortVersionString: $(defaults read "$APP_BUNDLE/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || echo 'N/A')"
    echo "   CFBundleVersion: $(defaults read "$APP_BUNDLE/Contents/Info.plist" CFBundleVersion 2>/dev/null || echo 'N/A')"
    echo "   MinimumOSVersion: $(defaults read "$APP_BUNDLE/Contents/Info.plist" LSMinimumSystemVersion 2>/dev/null || echo 'N/A')"
  fi
fi

# 4. Validate with spctl (Gatekeeper)
echo ""
echo "8. Gatekeeper Assessment:"
spctl --assess --verbose --type install "$PKG_PATH" 2>&1 || echo "   ⚠️  Gatekeeper assessment (this is normal for MAS packages)"

# 5. Check package installer
echo ""
echo "9. Package Installer Validation:"
installer -volumes -pkg "$PKG_PATH" 2>&1 | head -10 || echo "   ⚠️  Installer validation (run with sudo for full check)"

# 6. Validate with altool (if available)
echo ""
echo "10. App Store Validation (xcrun altool):"
if command -v xcrun &> /dev/null; then
  # Note: This requires App Store Connect API key or Apple ID
  # Uncomment and configure if you have credentials set up
  # xcrun altool --validate-app -f "$PKG_PATH" -t macos -u "YOUR_APPLE_ID" -p "YOUR_APP_SPECIFIC_PASSWORD"
  echo "   ℹ️  To validate with App Store Connect, use:"
  echo "   xcrun altool --validate-app -f \"$PKG_PATH\" -t macos -u \"YOUR_APPLE_ID\" -p \"YOUR_APP_SPECIFIC_PASSWORD\""
  echo "   Or use Transporter app for GUI validation"
else
  echo "   ⚠️  xcrun not available"
fi

echo ""
echo "=========================================="
echo "Validation Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Upload via Transporter app (recommended)"
echo "2. Or use: xcrun altool --upload-app -f \"$PKG_PATH\" -t macos -u \"YOUR_APPLE_ID\" -p \"YOUR_APP_SPECIFIC_PASSWORD\""
echo ""

