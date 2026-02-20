#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  Building Pantry for Mac App Store (Universal Binary)"
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
echo "🔍 Checking for Mac App Store certificates..."
APP_CERT_FULL=$(security find-identity -v -p codesigning | grep '3rd Party Mac Developer Application:' | head -n1 | grep -o '"[^"]*"$' | tr -d '"')
INST_CERT_FULL=$(security find-identity -v | grep '3rd Party Mac Developer Installer:' | head -n1 | grep -o '"[^"]*"$' | tr -d '"')

# Extract just the name part (after the colon and space)
APP_CERT=$(echo "$APP_CERT_FULL" | sed 's/3rd Party Mac Developer Application: //')
INST_CERT=$(echo "$INST_CERT_FULL" | sed 's/3rd Party Mac Developer Installer: //')

if [ -z "$APP_CERT_FULL" ]; then
	echo "❌ ERROR: 3rd Party Mac Developer Application certificate NOT found!"
	echo "   Please install it from: https://developer.apple.com/account/resources/certificates/list"
	echo "   Run: security find-identity -v -p codesigning"
	exit 1
fi

echo "✅ Found Application certificate: $APP_CERT_FULL"
echo "   Using identity: $APP_CERT"
if [ -z "$INST_CERT_FULL" ]; then
	echo "⚠️  WARNING: 3rd Party Mac Developer Installer certificate NOT found!"
	echo "   The build may fail during package signing."
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

# Set identity variables for electron-builder (WITHOUT prefix)
export CSC_NAME="$APP_CERT"
export CSC_INSTALLER_NAME="$INST_CERT"

echo "🔐 Environment variables set:"
echo "   CSC_NAME=$CSC_NAME"
echo "   CSC_INSTALLER_NAME=$CSC_INSTALLER_NAME"
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

# Build the MAS package with signing enabled
echo ""
echo "🔨 Building Mac App Store package (universal binary)..."
# Get the updated version (after auto-increment)
VERSION=$(node -p "require('./package.json').version")
echo "   Version: $VERSION"
echo ""

electron-builder build --mac mas:universal --config electron-builder.yml

# Check if build was successful
if [ $? -eq 0 ]; then
	echo ""
	echo "═══════════════════════════════════════════════════════════════"
	echo "  ✅ BUILD SUCCESSFUL!"
	echo "═══════════════════════════════════════════════════════════════"
	echo ""

	# Find the package file
	PKG_FILE=$(find dist-app -name "Pantry-*.pkg" -type f | head -1)

	if [ -n "$PKG_FILE" ]; then
		PKG_SIZE=$(du -h "$PKG_FILE" | cut -f1)
		echo "📦 Package created: $PKG_FILE"
		echo "   Size: $PKG_SIZE"
		echo ""

		# Verify the signature
		echo "🔍 Verifying package signature..."
		pkgutil --check-signature "$PKG_FILE"
		echo ""

		echo "📋 NEXT STEPS:"
		echo ""
		echo "1. Upload to App Store Connect:"
		echo "   • Open Transporter app (from Mac App Store)"
		echo "   • Drag and drop: $PKG_FILE"
		echo "   • Click 'Deliver'"
		echo ""
		echo "   OR use command line:"
		echo "   xcrun altool --upload-app --type macos --file \"$PKG_FILE\" \\"
		echo "     --apiKey YOUR_API_KEY --apiIssuer YOUR_ISSUER_ID"
		echo ""
		echo "2. After upload, go to App Store Connect:"
		echo "   https://appstoreconnect.apple.com/apps"
		echo "   • Select your app"
		echo "   • Go to 'TestFlight' or 'App Store' tab"
		echo "   • Submit for review"
		echo ""
		echo "═══════════════════════════════════════════════════════════════"
	else
		echo "⚠️  Warning: Package file not found in dist-app/"
		echo "   Check the build output above for errors"
	fi
else
	echo ""
	echo "═══════════════════════════════════════════════════════════════"
	echo "  ❌ BUILD FAILED"
	echo "═══════════════════════════════════════════════════════════════"
	echo ""
	echo "Please check the error messages above and verify:"
	echo "1. All certificates are installed correctly"
	echo "2. Provisioning profile exists: .credentials/Pantry_Distribution.provisionprofile"
	echo "3. Icon exists: build/icon.icns"
	echo "4. Entitlements files exist in build/ directory"
	echo ""
	exit 1
fi
