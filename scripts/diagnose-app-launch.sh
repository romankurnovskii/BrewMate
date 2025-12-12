#!/bin/bash
# Script to diagnose why BrewMate app won't launch
# Usage: ./scripts/diagnose-app-launch.sh [path-to-app]

echo "=========================================="
echo "BrewMate Launch Diagnostics"
echo "=========================================="
echo ""

# Find the app bundle
if [ -n "$1" ]; then
  APP_PATH="$1"
else
  # Try common locations
  if [ -d "/Applications/BrewMate.app" ]; then
    APP_PATH="/Applications/BrewMate.app"
  elif [ -d "dist-app/mas-universal/BrewMate.app" ]; then
    APP_PATH="dist-app/mas-universal/BrewMate.app"
  else
    # Try to find it
    APP_PATH=$(find . -name "BrewMate.app" -type d 2>/dev/null | head -1)
    if [ -z "$APP_PATH" ]; then
      APP_PATH=$(find ~/Desktop ~/Downloads /Applications -name "BrewMate.app" -type d 2>/dev/null | head -1)
    fi
  fi
fi

if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
  echo "❌ ERROR: BrewMate.app not found!"
  echo ""
  echo "Please provide the path to the app:"
  echo "  $0 /path/to/BrewMate.app"
  echo ""
  echo "Or install it first, then run this script."
  exit 1
fi

echo "Found app at: $APP_PATH"
echo ""

# Get absolute path
APP_PATH=$(cd "$(dirname "$APP_PATH")" && pwd)/$(basename "$APP_PATH")

# Check if this is a MAS build
if [ -f "$APP_PATH/Contents/embedded.provisionprofile" ]; then
  echo "=========================================="
  echo "⚠️  MAS BUILD DETECTED"
  echo "=========================================="
  echo ""
  echo "This appears to be a Mac App Store (MAS) build."
  echo ""
  echo "❌ MAS builds CANNOT be run locally!"
  echo ""
  echo "MAS builds are signed with production provisioning profiles"
  echo "that are only valid when distributed through the App Store."
  echo ""
  echo "The errors you're seeing are expected:"
  echo "  • 'embedded provisioning profile not valid'"
  echo "  • 'No matching profile found'"
  echo "  • 'Code signature validation failed'"
  echo "  • App being killed by macOS security"
  echo ""
  echo "✅ SOLUTION: Build a local test version instead:"
  echo ""
  echo "   npm run build:mac"
  echo ""
  echo "This will create a DMG in dist-app/mac/ that you can"
  echo "install and run on your Mac for testing."
  echo ""
  echo "MAS builds should ONLY be used for App Store submission."
  echo ""
  echo "See docs/BUILD_TYPES.md for more information."
  echo ""
  echo "=========================================="
  echo ""
  read -p "Continue with full diagnostics anyway? (y/n): " continue_diag
  if [ "$continue_diag" != "y" ]; then
    exit 0
  fi
  echo ""
fi

echo "=========================================="
echo "1. App Bundle Structure"
echo "=========================================="
echo ""

if [ ! -d "$APP_PATH/Contents" ]; then
  echo "❌ ERROR: App bundle is missing Contents directory!"
  exit 1
fi

echo "✓ Contents directory exists"
echo ""

# Check for main executable
EXECUTABLE=""
if [ -f "$APP_PATH/Contents/MacOS/BrewMate" ]; then
  EXECUTABLE="$APP_PATH/Contents/MacOS/BrewMate"
  echo "✓ Main executable found: $EXECUTABLE"
elif [ -f "$APP_PATH/Contents/MacOS/Electron" ]; then
  EXECUTABLE="$APP_PATH/Contents/MacOS/Electron"
  echo "✓ Main executable found: $EXECUTABLE"
else
  echo "❌ ERROR: Main executable not found!"
  echo "   Expected: $APP_PATH/Contents/MacOS/BrewMate"
  echo "   Or: $APP_PATH/Contents/MacOS/Electron"
  ls -la "$APP_PATH/Contents/MacOS/" 2>/dev/null || echo "   MacOS directory doesn't exist!"
fi

echo ""

# Check Info.plist
if [ -f "$APP_PATH/Contents/Info.plist" ]; then
  echo "✓ Info.plist found"
  echo ""
  echo "Bundle Information:"
  BUNDLE_ID=$(defaults read "$APP_PATH/Contents/Info.plist" CFBundleIdentifier 2>/dev/null || echo "N/A")
  VERSION=$(defaults read "$APP_PATH/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || echo "N/A")
  BUILD=$(defaults read "$APP_PATH/Contents/Info.plist" CFBundleVersion 2>/dev/null || echo "N/A")
  MIN_OS=$(defaults read "$APP_PATH/Contents/Info.plist" LSMinimumSystemVersion 2>/dev/null || echo "N/A")
  
  echo "  Bundle ID: $BUNDLE_ID"
  echo "  Version: $VERSION"
  echo "  Build: $BUILD"
  echo "  Minimum OS: $MIN_OS"
else
  echo "❌ ERROR: Info.plist not found!"
fi

echo ""
echo "=========================================="
echo "2. Code Signing Verification"
echo "=========================================="
echo ""

if [ -n "$EXECUTABLE" ] && [ -f "$EXECUTABLE" ]; then
  echo "Checking code signature..."
  echo ""
  
  # Detailed signature info
  echo "Signature Details:"
  codesign -dv --verbose=4 "$APP_PATH" 2>&1 | head -20
  echo ""
  
  # Verify signature
  echo "Signature Verification:"
  if codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1; then
    echo "✅ Code signature is valid"
  else
    echo "❌ Code signature verification FAILED"
    echo ""
    echo "This is likely the cause of the launch failure!"
  fi
  
  echo ""
  
  # Check entitlements
  echo "Entitlements:"
  codesign -d --entitlements - "$APP_PATH" 2>&1 | plutil -p - 2>/dev/null || codesign -d --entitlements - "$APP_PATH" 2>&1 | head -30
else
  echo "⚠️  Cannot check code signing - executable not found"
fi

echo ""
echo "=========================================="
echo "3. Gatekeeper Status"
echo "=========================================="
echo ""

# Check Gatekeeper assessment
echo "Gatekeeper Assessment:"
spctl --assess --verbose --type execute "$APP_PATH" 2>&1 || echo "⚠️  Gatekeeper assessment failed (this may be normal for MAS apps)"
echo ""

# Check quarantine attributes
echo "Quarantine Attributes:"
xattr -l "$APP_PATH" 2>/dev/null | grep -i quarantine || echo "  No quarantine attributes"
echo ""

echo "=========================================="
echo "4. System Logs (Recent Errors)"
echo "=========================================="
echo ""

# Get recent system logs related to BrewMate
echo "Checking system logs for BrewMate errors (last 5 minutes)..."
echo ""

# Try to get logs using log command (macOS 10.12+)
if command -v log &> /dev/null; then
  echo "Recent log entries for BrewMate:"
  log show --predicate 'process == "BrewMate" OR eventMessage contains "BrewMate"' --last 5m --style compact 2>/dev/null | tail -20 || echo "  No recent log entries found"
  echo ""
  
  echo "Recent system errors:"
  log show --predicate 'eventMessage contains "BrewMate" AND (messageType == error OR messageType == fault)' --last 5m --style compact 2>/dev/null | tail -20 || echo "  No error entries found"
  echo ""
fi

# Also check Console.app logs
echo "Console Log Locations:"
echo "  ~/Library/Logs/DiagnosticReports/"
echo "  /Library/Logs/DiagnosticReports/"
echo ""

# Check for crash reports
CRASH_REPORTS=$(find ~/Library/Logs/DiagnosticReports /Library/Logs/DiagnosticReports -name "*BrewMate*" -type f -mtime -1 2>/dev/null | head -5)
if [ -n "$CRASH_REPORTS" ]; then
  echo "⚠️  Found recent crash reports:"
  echo "$CRASH_REPORTS" | while read -r report; do
    echo "  - $report"
  done
  echo ""
  echo "To view a crash report:"
  echo "  open \"$CRASH_REPORTS\""
  echo ""
else
  echo "✓ No recent crash reports found"
  echo ""
fi

echo "=========================================="
echo "5. Try Running from Terminal"
echo "=========================================="
echo ""

if [ -n "$EXECUTABLE" ] && [ -f "$EXECUTABLE" ]; then
  echo "Attempting to run the app from terminal..."
  echo "This will show the actual error message:"
  echo ""
  echo "--- Output Start ---"
  
  # Try to run it and capture output
  "$EXECUTABLE" 2>&1 &
  APP_PID=$!
  sleep 2
  
  # Check if it's still running
  if ps -p $APP_PID > /dev/null 2>&1; then
    echo "✓ App started successfully (PID: $APP_PID)"
    echo "   If it's not visible, check Activity Monitor"
    kill $APP_PID 2>/dev/null || true
  else
    echo "❌ App failed to start"
    echo "   Check the error messages above"
  fi
  
  echo "--- Output End ---"
else
  echo "⚠️  Cannot run app - executable not found"
fi

echo ""
echo "=========================================="
echo "6. File Permissions"
echo "=========================================="
echo ""

if [ -n "$EXECUTABLE" ] && [ -f "$EXECUTABLE" ]; then
  echo "Executable permissions:"
  ls -l "$EXECUTABLE"
  echo ""
  
  if [ -x "$EXECUTABLE" ]; then
    echo "✅ Executable has execute permissions"
  else
    echo "❌ Executable is missing execute permissions!"
    echo "   Try: chmod +x \"$EXECUTABLE\""
  fi
else
  echo "⚠️  Cannot check permissions - executable not found"
fi

echo ""
echo "=========================================="
echo "7. Dependencies Check"
echo "=========================================="
echo ""

if [ -n "$EXECUTABLE" ] && [ -f "$EXECUTABLE" ]; then
  echo "Checking dynamic library dependencies:"
  otool -L "$EXECUTABLE" 2>/dev/null | head -20 || echo "  Could not read dependencies"
  echo ""
  
  echo "Checking for missing frameworks:"
  if [ -d "$APP_PATH/Contents/Frameworks" ]; then
    echo "✓ Frameworks directory exists"
    FRAMEWORKS=$(find "$APP_PATH/Contents/Frameworks" -name "*.framework" -type d 2>/dev/null | wc -l | tr -d ' ')
    echo "  Found $FRAMEWORKS frameworks"
  else
    echo "⚠️  Frameworks directory not found"
  fi
fi

echo ""
echo "=========================================="
echo "8. Quick Fixes to Try"
echo "=========================================="
echo ""

echo "If code signing failed, try:"
echo "  1. Rebuild the app: npm run build:mas:universal"
echo "  2. Check your certificates: security find-identity -v -p codesigning"
echo ""
echo "If Gatekeeper is blocking:"
echo "  1. Remove quarantine: xattr -d com.apple.quarantine \"$APP_PATH\""
echo "  2. Or allow in System Settings → Privacy & Security"
echo ""
echo "If permissions are wrong:"
echo "  chmod +x \"$EXECUTABLE\""
echo ""
echo "To view full system logs:"
echo "  open -a Console"
echo "  Then search for 'BrewMate'"
echo ""

echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
echo ""

