#!/bin/bash
# Test local build on current Mac
# This simulates what users will experience
# Usage: ./scripts/test-local-build.sh

set -e

echo "=========================================="
echo "Local Build Testing"
echo "=========================================="
echo ""

# Find the DMG (check multiple locations)
DMG_PATH=$(find dist-app -name "BrewMate-*.dmg" -type f -not -path "*/mas-*/*" | sort -r | head -1)

if [ ! -f "$DMG_PATH" ]; then
  echo "❌ ERROR: DMG not found. Build first with: npm run build:mac"
  exit 1
fi

echo "📦 DMG: $DMG_PATH"
echo ""

# Mount DMG
echo "Mounting DMG..."
MOUNT_OUTPUT=$(hdiutil attach "$DMG_PATH" 2>&1)
MOUNT_EXIT=$?

if [ $MOUNT_EXIT -ne 0 ]; then
  echo "❌ Failed to mount DMG"
  echo "   Error: $MOUNT_OUTPUT"
  exit 1
fi

# Wait a moment for mount to complete
sleep 1

# Find mount point - try multiple methods
MOUNT_POINT=""

# Method 1: Extract from hdiutil output
MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | grep -oE '/Volumes/[^[:space:]]+' | head -1)

# Method 2: Use hdiutil info to find the mount point
if [ -z "$MOUNT_POINT" ] || [ ! -d "$MOUNT_POINT" ]; then
  DMG_DEVICE=$(echo "$MOUNT_OUTPUT" | grep -oE '/dev/disk[0-9]+' | head -1)
  if [ -n "$DMG_DEVICE" ]; then
    MOUNT_POINT=$(hdiutil info | grep -A 5 "$DMG_DEVICE" | grep -oE '/Volumes/[^[:space:]]+' | head -1)
  fi
fi

# Method 3: Find by checking /Volumes for recently modified or by name
if [ -z "$MOUNT_POINT" ] || [ ! -d "$MOUNT_POINT" ]; then
  # Try to find by volume name (BrewMate)
  if [ -d "/Volumes/BrewMate" ]; then
    MOUNT_POINT="/Volumes/BrewMate"
  elif [ -d "/Volumes/BrewMate 1.0.2" ]; then
    MOUNT_POINT="/Volumes/BrewMate 1.0.2"
  else
    # Get the most recently modified volume (likely our DMG)
    MOUNT_POINT=$(find /Volumes -maxdepth 1 -type d -newer "$DMG_PATH" 2>/dev/null | head -1)
  fi
fi

# Verify mount point exists
if [ -z "$MOUNT_POINT" ] || [ ! -d "$MOUNT_POINT" ]; then
  echo "❌ Failed to find mount point"
  echo "   Mount output: $MOUNT_OUTPUT"
  echo "   Available volumes:"
  ls -la /Volumes/ 2>/dev/null | head -10
  exit 1
fi

echo "   Mounted at: $MOUNT_POINT"

# Find the app - it might be directly in the root or in a subdirectory
APP_PATH="$MOUNT_POINT/BrewMate.app"

if [ ! -d "$APP_PATH" ]; then
  # Try to find it anywhere in the DMG
  echo "   Searching for app bundle..."
  APP_PATH=$(find "$MOUNT_POINT" -name "BrewMate.app" -type d -maxdepth 3 2>/dev/null | head -1)
  
  if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found in DMG"
    echo "   Contents of DMG:"
    if [ -d "$MOUNT_POINT" ]; then
      ls -la "$MOUNT_POINT" | head -10
    else
      echo "   Mount point no longer accessible"
    fi
    hdiutil detach "$MOUNT_POINT" > /dev/null 2>&1 || true
    exit 1
  fi
fi

echo "   Found app at: $APP_PATH"
echo ""

# Copy to Applications for testing
echo "Copying to Applications..."
INSTALL_PATH="/Applications/BrewMate.app"
if [ -d "$INSTALL_PATH" ]; then
  echo "   Removing existing installation..."
  rm -rf "$INSTALL_PATH"
fi

cp -R "$APP_PATH" "$INSTALL_PATH"
echo "✅ Installed to: $INSTALL_PATH"
echo ""

# Unmount DMG (use the actual mount point where the app was found)
DMG_MOUNT_POINT=$(dirname "$APP_PATH")
if [ "$DMG_MOUNT_POINT" != "/" ] && [ -d "$DMG_MOUNT_POINT" ]; then
  echo "Unmounting DMG..."
  hdiutil detach "$DMG_MOUNT_POINT" > /dev/null 2>&1 || true
fi

# Test launch
echo "Testing app launch..."
echo "   Attempting to launch app..."
open "$INSTALL_PATH"

# Wait a bit
sleep 3

# Check if it's running
if pgrep -f "BrewMate" > /dev/null; then
  echo "   ✅ App is running"
  echo ""
  echo "   Please test the app manually:"
  echo "   - Check all features work"
  echo "   - Verify UI displays correctly"
  echo "   - Test install/uninstall functionality"
  echo ""
  read -p "   Press Enter when done testing..."
  
  # Kill app
  pkill -f "BrewMate" || true
  echo "   ✅ Testing complete"
else
  echo "   ⚠️  App may not have launched properly"
  echo "   Check Console.app for errors"
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
echo ""
echo "If everything works, you can build MAS version:"
echo "   npm run build:mas"
echo ""

