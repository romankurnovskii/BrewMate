#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  Building BrewMate for Direct Distribution (Universal Binary)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Load .env file if it exists
if [ -f .env ]; then
	echo "📝 Loading .env file..."
	source .env
else
	echo "⚠️  Warning: .env file not found"
fi

# Check for required certificates
echo "🔍 Checking for Developer ID certificates..."
APP_CERT_FULL=$(security find-identity -v -p codesigning | grep 'Developer ID Application:' | head -n1 | grep -o '"[^"]*"$' | tr -d '"')
INST_CERT_FULL=$(security find-identity -v | grep 'Developer ID Installer:' | head -n1 | grep -o '"[^"]*"$' | tr -d '"')

# Extract just the name part (after the colon and space)
APP_CERT=$(echo "$APP_CERT_FULL" | sed 's/Developer ID Application: //')
INST_CERT=$(echo "$INST_CERT_FULL" | sed 's/Developer ID Installer: //')

if [ -z "$APP_CERT_FULL" ]; then
	echo "❌ ERROR: Developer ID Application certificate NOT found!"
	echo "   Please install it from: https://developer.apple.com/account/resources/certificates/list"
	echo "   Create a 'Developer ID Application' certificate"
	echo "   Run: security find-identity -v -p codesigning"
	exit 1
fi

echo "✅ Found Application certificate: $APP_CERT_FULL"
echo "   Using identity: $APP_CERT"
if [ -z "$INST_CERT_FULL" ]; then
	echo "⚠️  WARNING: Developer ID Installer certificate NOT found!"
	echo "   The DMG will not be signed. Consider creating one."
else
	echo "✅ Found Installer certificate: $INST_CERT_FULL"
	echo "   Using identity: $INST_CERT"
fi

echo ""
echo "🔨 Starting build process..."
echo ""

# Auto-increment version in package.json
echo "📝 Auto-incrementing version in package.json..."
CURRENT_VERSION=$(node -p "require('./package.json').version")
# Increment patch version (1.0.5 -> 1.0.6)
NEW_VERSION=$(node -e "
  const v = '$CURRENT_VERSION'.split('.');
  v[2] = parseInt(v[2] || 0) + 1;
  console.log(v.join('.'));
")

# Update package.json with new version
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "   Version updated: $CURRENT_VERSION → $NEW_VERSION"
echo ""

# Set identity variables for electron-builder
export CSC_NAME="$APP_CERT"
if [ -n "$INST_CERT_FULL" ]; then
	export CSC_INSTALLER_NAME="$INST_CERT"
fi

echo "🔐 Environment variables set:"
echo "   CSC_NAME=$CSC_NAME"
if [ -n "$CSC_INSTALLER_NAME" ]; then
	echo "   CSC_INSTALLER_NAME=$CSC_INSTALLER_NAME"
fi
echo ""

# Regenerate icon from latest source (ensures we use the newest icon)
echo "🎨 Regenerating app icon..."
if [ -f "scripts/convert-icon.sh" ]; then
	./scripts/convert-icon.sh
else
	echo "⚠️  Warning: convert-icon.sh not found, using existing build/icon.icns"
fi
echo ""

# Build TypeScript first
echo "📦 Building TypeScript..."
npm run build

# Build the direct distribution package with signing enabled
echo ""
echo "🔨 Building direct distribution package (universal binary)..."
VERSION=$(node -p "require('./package.json').version")
echo "   Version: $VERSION"
echo ""

npx electron-builder build --mac --universal --config electron-builder.yml

# Check if build was successful
if [ $? -eq 0 ]; then
	echo ""
	echo "═══════════════════════════════════════════════════════════════"
	echo "  ✅ BUILD SUCCESSFUL!"
	echo "═══════════════════════════════════════════════════════════════"
	echo ""

	# Find the DMG file
	DMG_FILE=$(find dist-app -name "BrewMate-*.dmg" -type f | head -1)

	if [ -n "$DMG_FILE" ]; then
		DMG_SIZE=$(du -h "$DMG_FILE" | cut -f1)
		echo "📦 DMG created: $DMG_FILE"
		echo "   Size: $DMG_SIZE"
		echo ""

		# Verify the signature
		echo "🔍 Verifying code signature..."
		codesign --verify --verbose=4 "$DMG_FILE" 2>/dev/null || echo "   (DMG signature check skipped)"
		echo ""

		# Check if we should notarize
		if [ -n "$APPLE_ID" ] && [ -n "$APPLE_APP_SPECIFIC_PASSWORD" ] && [ -n "$APPLE_TEAM_ID" ]; then
			echo "🔐 Notarization credentials found. Notarizing..."
			
			# Notarize the DMG
			xcrun notarytool submit "$DMG_FILE" \
				--apple-id "$APPLE_ID" \
				--password "$APPLE_APP_SPECIFIC_PASSWORD" \
				--team-id "$APPLE_TEAM_ID" \
				--wait
			
			echo ""
			echo "✅ Notarization complete!"
		else
			echo "⚠️  Notarization credentials not found."
			echo "   To notarize your app (required for Gatekeeper), set these environment variables:"
			echo "   - APPLE_ID: Your Apple ID email"
			echo "   - APPLE_APP_SPECIFIC_PASSWORD: App-specific password from appleid.apple.com"
			echo "   - APPLE_TEAM_ID: Your Developer ID Team ID (found at developer.apple.com)"
			echo ""
			echo "   You can add these to your .env file for future builds."
		fi

		echo "📋 NEXT STEPS:"
		echo ""
		echo "1. Distribute your app:"
		echo "   • Upload $DMG_FILE to your website"
		echo "   • Or share directly with users"
		echo ""
		echo "2. Users can install by:"
		echo "   • Opening the DMG file"
		echo "   • Dragging BrewMate.app to Applications folder"
		echo ""
		echo "═══════════════════════════════════════════════════════════════"
	else
		echo "⚠️  Warning: DMG file not found in dist-app/"
		echo "   Check the build output above for errors"
	fi
else
	echo ""
	echo "═══════════════════════════════════════════════════════════════"
	echo "  ❌ BUILD FAILED"
	echo "═══════════════════════════════════════════════════════════════"
	echo ""
	echo "Please check the error messages above and verify:"
	echo "1. Developer ID certificate is installed correctly"
	echo "2. Icon exists: build/icon.icns"
	echo "3. Entitlements file exists: build/entitlements.mac.plist"
	echo ""
	exit 1
fi