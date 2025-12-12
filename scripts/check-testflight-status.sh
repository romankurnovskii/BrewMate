#!/bin/bash
# Script to help troubleshoot TestFlight issues for Mac App Store apps

echo "=========================================="
echo "TestFlight Troubleshooting Guide"
echo "=========================================="
echo ""

echo "IMPORTANT: Mac TestFlight works differently than iOS!"
echo ""
echo "Key Differences:"
echo "1. Mac apps don't automatically appear in TestFlight"
echo "2. You must manually add builds to TestFlight groups"
echo "3. Processing can take longer (sometimes 24-48 hours)"
echo "4. TestFlight is accessed via App Store Connect website, not the TestFlight app"
echo ""

echo "=========================================="
echo "Step 1: Check Build Status in App Store Connect"
echo "=========================================="
echo ""
echo "1. Go to: https://appstoreconnect.apple.com"
echo "2. Navigate to: My Apps → BrewMate → TestFlight (left sidebar)"
echo "3. Check the 'macOS Builds' section"
echo ""
echo "Look for your build and check its status:"
echo "  ✅ 'Ready to Submit' - Build is ready, but needs to be added to TestFlight"
echo "  ⏳ 'Processing' - Still being processed (can take hours)"
echo "  ❌ 'Invalid Binary' or 'Failed' - Check error details"
echo "  ⚠️  'Missing Compliance' - May need export compliance info"
echo ""

echo "=========================================="
echo "Step 2: Add Build to TestFlight (if Ready)"
echo "=========================================="
echo ""
echo "If your build shows 'Ready to Submit':"
echo ""
echo "1. In App Store Connect → TestFlight → macOS Builds"
echo "2. Find your build (version 1.0.1, build 4)"
echo "3. Click on the build"
echo "4. Scroll down to 'TestFlight Testing' section"
echo "5. Click 'Add to TestFlight' or 'Enable TestFlight Testing'"
echo "6. Select or create a TestFlight group"
echo "7. Add internal testers (your team) or external testers"
echo ""

echo "=========================================="
echo "Step 3: Common Issues & Solutions"
echo "=========================================="
echo ""

echo "Issue: Build shows 'Processing' for days"
echo "Solution:"
echo "  - Mac builds can take 24-48 hours to process"
echo "  - Check if there are any error emails from Apple"
echo "  - Verify the build was uploaded successfully"
echo ""

echo "Issue: Build shows 'Invalid Binary'"
echo "Solution:"
echo "  - Check the error message in App Store Connect"
echo "  - Common causes:"
echo "    * Code signing issues"
echo "    * Missing entitlements"
echo "    * Incorrect provisioning profile"
echo "    * Bundle identifier mismatch"
echo "  - Rebuild with: npm run build:mas universal"
echo ""

echo "Issue: Build not showing in TestFlight tab"
echo "Solution:"
echo "  - Make sure you're looking at 'TestFlight' tab, not 'App Store' tab"
echo "  - Check 'macOS Builds' section (not iOS Builds)"
echo "  - The build might be in 'App Store' → 'Versions' instead"
echo ""

echo "Issue: 'TestFlight Testing' section is missing"
echo "Solution:"
echo "  - TestFlight might not be enabled for your app"
echo "  - Go to: App Store Connect → Users and Access → TestFlight"
echo "  - Ensure TestFlight is enabled for your account"
echo "  - Some apps need to be approved first before TestFlight is available"
echo ""

echo "Issue: Can't find TestFlight option"
echo "Solution:"
echo "  - Mac TestFlight is ONLY available via App Store Connect website"
echo "  - There is NO TestFlight app for Mac (unlike iOS)"
echo "  - Testers install via TestFlight website or direct link"
echo ""

echo "=========================================="
echo "Step 4: Verify Build Information"
echo "=========================================="
echo ""

# Check if we can find the built package
# Package name format: BrewMate-{version}-{arch}.pkg
PKG_DIR="dist-app/mas-universal"
PKG_PATH=""

# Try to find the package file (it has version in the name)
if [ -d "$PKG_DIR" ]; then
  # Find the most recent .pkg file matching the pattern
  PKG_PATH=$(find "$PKG_DIR" -name "BrewMate-*-*.pkg" -type f | sort -r | head -1)
fi

if [ -n "$PKG_PATH" ] && [ -f "$PKG_PATH" ]; then
  echo "✓ Found package: $PKG_PATH"
  echo ""
  echo "Package details:"
  
  # Extract version from package name (BrewMate-1.0.2-universal.pkg -> 1.0.2)
  PKG_NAME=$(basename "$PKG_PATH")
  VERSION_FROM_PKG=$(echo "$PKG_NAME" | sed -E 's/BrewMate-([^-]+)-.*\.pkg/\1/')
  ARCH_FROM_PKG=$(echo "$PKG_NAME" | sed -E 's/BrewMate-[^-]+-(.+)\.pkg/\1/')
  
  # Try to get version info from package.json
  if [ -f "package.json" ]; then
    VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
    echo "  Version (from package.json): $VERSION"
    echo "  Version (from package name): $VERSION_FROM_PKG"
  else
    echo "  Version (from package name): $VERSION_FROM_PKG"
  fi
  
  echo "  Architecture: $ARCH_FROM_PKG"
  
  # Check bundle version from electron-builder.yml
  if [ -f "electron-builder.yml" ]; then
    BUNDLE_VERSION=$(grep -o 'bundleVersion: "[^"]*"' electron-builder.yml | cut -d'"' -f2)
    echo "  Build Number: $BUNDLE_VERSION"
  fi
  
  echo ""
  echo "Verify these match what's in App Store Connect!"
else
  echo "⚠️  Package not found in: $PKG_DIR"
  echo "   Looking for pattern: BrewMate-*-*.pkg"
  echo "   Build the package first with: npm run build:mas:universal"
fi

echo ""
echo "=========================================="
echo "Step 5: Manual Check Commands"
echo "=========================================="
echo ""
echo "Check build status via API (requires App Store Connect API key):"
echo "  # This requires setting up API key first"
echo "  # See: https://developer.apple.com/documentation/appstoreconnectapi"
echo ""

echo "Check if build was uploaded successfully:"
echo "  # Look for confirmation email from Apple"
echo "  # Check Transporter app upload history"
echo ""

echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Log into App Store Connect: https://appstoreconnect.apple.com"
echo "2. Go to: My Apps → BrewMate → TestFlight"
echo "3. Check 'macOS Builds' section for your build"
echo "4. If build is ready, add it to a TestFlight group"
echo "5. Add testers and send invitations"
echo ""
echo "For more help, see:"
echo "  https://developer.apple.com/testflight/"
echo "  https://help.apple.com/app-store-connect/#/dev8b8fb3f3e"
echo ""

