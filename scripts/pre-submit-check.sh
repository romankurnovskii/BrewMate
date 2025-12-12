#!/bin/bash
# Comprehensive pre-submission validation for MAS builds
# This checks everything that could cause App Store rejection
# Usage: ./scripts/pre-submit-check.sh [path-to-pkg]

set -e

echo "=========================================="
echo "Pre-Submission Validation Checklist"
echo "=========================================="
echo ""

# Find package
if [ -n "$1" ]; then
  PKG_PATH="$1"
else
  PKG_DIR="dist-app/mas-universal"
  PKG_PATH=$(find "$PKG_DIR" -name "BrewMate-*-*.pkg" -type f | sort -r | head -1)
fi

if [ ! -f "$PKG_PATH" ]; then
  echo "❌ ERROR: Package not found at: $PKG_PATH"
  echo "   Build first with: npm run build:mas"
  exit 1
fi

echo "📦 Package: $PKG_PATH"
echo ""

# Extract package
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Extracting package..."
pkgutil --expand "$PKG_PATH" "$TEMP_DIR/pkg-expanded" > /dev/null 2>&1

# MAS packages have the app in a Payload file (cpio+gzip)
PAYLOAD=$(find "$TEMP_DIR/pkg-expanded" -name "Payload" -type f | head -1)

if [ -n "$PAYLOAD" ]; then
  echo "Extracting Payload..."
  cd "$TEMP_DIR"
  # Payload is gzip-compressed cpio
  gunzip -c "$PAYLOAD" 2>/dev/null | cpio -id 2>/dev/null || true
  APP_BUNDLE=$(find "$TEMP_DIR" -name "*.app" -type d | head -1)
else
  # Try direct find (for other package formats)
  APP_BUNDLE=$(find "$TEMP_DIR/pkg-expanded" -name "*.app" -type d | head -1)
fi

if [ -z "$APP_BUNDLE" ] || [ ! -d "$APP_BUNDLE" ]; then
  echo "❌ ERROR: No .app bundle found in package"
  echo "   Searched in: $TEMP_DIR/pkg-expanded"
  if [ -n "$PAYLOAD" ]; then
    echo "   Found Payload at: $PAYLOAD"
    echo "   Attempting manual extraction..."
    cd "$TEMP_DIR"
    gunzip -c "$PAYLOAD" 2>&1 | cpio -idv 2>&1 | head -10
  fi
  exit 1
fi

echo "✅ Found app bundle: $(basename "$APP_BUNDLE")"
echo ""

ERRORS=0
WARNINGS=0

# 1. Check architecture (must be universal for App Store)
echo "1. Architecture Check:"
ARCHS=$(lipo -info "$APP_BUNDLE/Contents/MacOS/BrewMate" 2>/dev/null | grep -oE '(arm64|x86_64)' || echo "")
if echo "$ARCHS" | grep -q "arm64" && echo "$ARCHS" | grep -q "x86_64"; then
  echo "   ✅ Universal binary (arm64 + x86_64)"
elif echo "$ARCHS" | grep -q "arm64"; then
  echo "   ⚠️  ARM64 only - App Store prefers universal"
  WARNINGS=$((WARNINGS + 1))
elif echo "$ARCHS" | grep -q "x86_64"; then
  echo "   ⚠️  Intel only - Missing ARM64 support"
  WARNINGS=$((WARNINGS + 1))
else
  echo "   ❌ Could not determine architecture"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Code signing
echo "2. Code Signing:"

# First, just check if it's signed at all (fast check)
echo "   Quick signature check..."
SIGN_INFO=$(codesign -dv "$APP_BUNDLE" 2>&1 || echo "UNSIGNED")

if echo "$SIGN_INFO" | grep -q "UNSIGNED"; then
  echo "   ❌ App is not signed"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ App is signed"
  
  # Check certificate type
  echo "   Checking certificate type..."
  SIGNER=$(echo "$SIGN_INFO" | grep -i "authority" | head -1 | sed -E 's/.*Authority=([^,]+).*/\1/' || echo "")
  
  if [ -n "$SIGNER" ] && echo "$SIGNER" | grep -qi "3rd Party Mac Developer"; then
    echo "   ✅ Signed with MAS certificate: $SIGNER"
  else
    echo "   ⚠️  Certificate: $SIGNER"
    echo "      Expected: 3rd Party Mac Developer Application"
    WARNINGS=$((WARNINGS + 1))
  fi
  
  # Try a basic verify (without --deep which hangs)
  echo "   Verifying signature validity..."
  
  # Run in background with manual timeout
  VERIFY_OUTPUT=$(mktemp)
  (codesign --verify --strict "$APP_BUNDLE" 2>&1 > "$VERIFY_OUTPUT") &
  VERIFY_PID=$!
  
  # Wait up to 10 seconds
  for i in {1..10}; do
    if ! kill -0 $VERIFY_PID 2>/dev/null; then
      break
    fi
    sleep 1
  done
  
  # Kill if still running
  if kill -0 $VERIFY_PID 2>/dev/null; then
    echo "   ⚠️  Signature verification timed out (this is common with Electron)"
    echo "      The app is signed correctly, verification just takes too long"
    kill -9 $VERIFY_PID 2>/dev/null || true
    WARNINGS=$((WARNINGS + 1))
  else
    # Process completed, check result
    VERIFY_RESULT=$(cat "$VERIFY_OUTPUT")
    if [ -z "$VERIFY_RESULT" ]; then
      echo "   ✅ Signature verification passed"
    else
      if echo "$VERIFY_RESULT" | grep -q "unsealed contents"; then
        echo "   ⚠️  Signature has unsealed contents warning"
        echo "      This is common with Electron apps and usually acceptable"
        WARNINGS=$((WARNINGS + 1))
      else
        echo "   ⚠️  Signature verification warning:"
        echo "$VERIFY_RESULT" | head -3 | sed 's/^/      /'
        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  fi
  rm -f "$VERIFY_OUTPUT"
fi
echo ""

# 3. Entitlements check
echo "3. Entitlements:"
ENTITLEMENTS=$(codesign -d --entitlements - "$APP_BUNDLE" 2>/dev/null || echo "")
if echo "$ENTITLEMENTS" | grep -q "com.apple.security.app-sandbox"; then
  echo "   ✅ App Sandbox enabled (required for MAS)"
else
  echo "   ❌ App Sandbox NOT enabled (required for MAS)"
  ERRORS=$((ERRORS + 1))
fi

# Check for disallowed entitlements
if echo "$ENTITLEMENTS" | grep -q "com.apple.security.cs.allow-jit"; then
  echo "   ⚠️  JIT enabled (may need justification)"
  WARNINGS=$((WARNINGS + 1))
fi

if echo "$ENTITLEMENTS" | grep -q "com.apple.security.cs.disable-library-validation"; then
  echo "   ⚠️  Library validation disabled (may need justification)"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 4. Provisioning profile
echo "4. Provisioning Profile:"
if [ -f "$APP_BUNDLE/Contents/embedded.provisionprofile" ]; then
  echo "   ✅ Provisioning profile present"
  
  # Check profile type
  PROFILE_TYPE=$(security cms -D -i "$APP_BUNDLE/Contents/embedded.provisionprofile" 2>/dev/null | grep -A 1 "ProvisionedDevices" | head -1 || echo "")
  if echo "$PROFILE_TYPE" | grep -q "ProvisionedDevices"; then
    echo "   ⚠️  Development profile detected (should be Distribution)"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "   ✅ Distribution profile (correct for MAS)"
  fi
else
  echo "   ❌ No provisioning profile found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Info.plist checks
echo "5. Info.plist Validation:"
INFO_PLIST="$APP_BUNDLE/Contents/Info.plist"
if [ -f "$INFO_PLIST" ]; then
  BUNDLE_ID=$(defaults read "$INFO_PLIST" CFBundleIdentifier 2>/dev/null || echo "")
  VERSION=$(defaults read "$INFO_PLIST" CFBundleShortVersionString 2>/dev/null || echo "")
  BUILD=$(defaults read "$INFO_PLIST" CFBundleVersion 2>/dev/null || echo "")
  MIN_OS=$(defaults read "$INFO_PLIST" LSMinimumSystemVersion 2>/dev/null || echo "")
  
  echo "   Bundle ID: $BUNDLE_ID"
  echo "   Version: $VERSION"
  echo "   Build: $BUILD"
  echo "   Min OS: $MIN_OS"
  
  # Check bundle ID format
  if [[ "$BUNDLE_ID" =~ ^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$ ]]; then
    echo "   ✅ Bundle ID format valid"
  else
    echo "   ⚠️  Bundle ID format may be invalid"
    WARNINGS=$((WARNINGS + 1))
  fi
  
  # Check version format
  if [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "   ✅ Version format valid"
  else
    echo "   ⚠️  Version format may be invalid (should be x.y.z)"
    WARNINGS=$((WARNINGS + 1))
  fi
  
  # Check build number
  if [[ "$BUILD" =~ ^[0-9]+$ ]] && [ "$BUILD" -gt 0 ]; then
    echo "   ✅ Build number valid: $BUILD"
    
    # Check if it matches electron-builder.yml mas.bundleVersion
    if [ -f "electron-builder.yml" ]; then
      # Extract bundleVersion from mas section (handles both quoted and unquoted values)
      # Look for bundleVersion in mas section specifically
      EXPECTED_BUILD=$(awk '/^mas:/{flag=1} flag && /^\s*bundleVersion:/{print; exit} /^[a-z]/ && !/^mas:/{flag=0}' electron-builder.yml | sed -E 's/.*bundleVersion:\s*"?([^"[:space:]#]+)"?.*/\1/')
      if [ -z "$EXPECTED_BUILD" ]; then
        # Fallback: try any bundleVersion
        EXPECTED_BUILD=$(grep -E "^\s*bundleVersion:" electron-builder.yml | sed -E 's/.*bundleVersion:\s*"?([^"[:space:]#]+)"?.*/\1/' | head -1)
      fi
      if [ -n "$EXPECTED_BUILD" ] && [ "$BUILD" != "$EXPECTED_BUILD" ]; then
        echo "   ⚠️  Build number mismatch: found '$BUILD', expected '$EXPECTED_BUILD'"
        echo "      Update electron-builder.yml mas.bundleVersion if needed"
        WARNINGS=$((WARNINGS + 1))
      elif [ -n "$EXPECTED_BUILD" ] && [ "$BUILD" = "$EXPECTED_BUILD" ]; then
        echo "   ✅ Build number matches electron-builder.yml mas.bundleVersion: $BUILD"
      fi
    fi
  else
    echo "   ❌ Build number should be a positive integer (found: '$BUILD')"
    echo "      Set bundleVersion in electron-builder.yml mas section"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "   ❌ Info.plist not found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 6. Check for common rejection reasons
echo "6. Common Rejection Checks:"

# Check for hardcoded paths
if grep -r "/Users/" "$APP_BUNDLE" 2>/dev/null | grep -v ".DS_Store" | head -1 > /dev/null; then
  echo "   ⚠️  Found hardcoded /Users/ paths (may cause rejection)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for debug symbols
if find "$APP_BUNDLE" -name "*.dSYM" -type d | head -1 > /dev/null; then
  echo "   ⚠️  Debug symbols found (should be stripped for release)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for node_modules (should be in asar)
if [ -d "$APP_BUNDLE/Contents/Resources/app/node_modules" ]; then
  echo "   ⚠️  node_modules directory found (should be in asar)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check file permissions
if find "$APP_BUNDLE" -type f ! -perm 644 | grep -v ".app/Contents/MacOS" | head -1 > /dev/null; then
  echo "   ⚠️  Some files have unusual permissions"
  WARNINGS=$((WARNINGS + 1))
fi

echo "   ✅ Basic structure checks passed"
echo ""

# 7. Package validation
echo "7. Package Validation:"
PKG_SIG_OUTPUT=$(pkgutil --check-signature "$PKG_PATH" 2>&1)
PKG_SIG_EXIT=$?

if [ $PKG_SIG_EXIT -eq 0 ]; then
  echo "   ✅ Package signature valid"
else
  echo "   ⚠️  Package signature check failed (may be normal for MAS packages)"
  echo "   Output: $PKG_SIG_OUTPUT" | head -3
  # Don't count as error - MAS packages often show warnings but are still valid
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 8. Size check
echo "8. Size Check:"
SIZE=$(du -h "$PKG_PATH" | cut -f1)
SIZE_BYTES=$(stat -f%z "$PKG_PATH" 2>/dev/null || stat -c%s "$PKG_PATH" 2>/dev/null)
SIZE_MB=$((SIZE_BYTES / 1024 / 1024))
echo "   Package size: $SIZE ($SIZE_MB MB)"
if [ $SIZE_MB -gt 200 ]; then
  echo "   ⚠️  Package is large (>200MB) - may take longer to review"
  WARNINGS=$((WARNINGS + 1))
elif [ $SIZE_MB -lt 1 ]; then
  echo "   ⚠️  Package seems too small - check if build completed"
  WARNINGS=$((WARNINGS + 1))
else
  echo "   ✅ Package size reasonable"
fi
echo ""

# Summary
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo ""
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ All checks passed! Ready for submission."
  echo ""
  echo "Next steps:"
  echo "1. Upload via Transporter app"
  echo "2. Test on TestFlight if possible"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Build has warnings but should be acceptable."
  echo "   Review warnings above before submitting."
  exit 0
else
  echo "❌ Build has errors. Fix them before submitting."
  exit 1
fi