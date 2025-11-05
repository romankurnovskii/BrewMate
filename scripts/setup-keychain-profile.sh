#!/bin/bash
# Script to set up keychain profile for notarization
# Based on: https://www.electronforge.io/guides/code-signing/code-signing-macos

echo "Setting up keychain profile for BrewMate notarization..."
echo ""
echo "You have two options:"
echo "1. App-Specific Password (recommended)"
echo "2. App Store Connect API Key"
echo ""

# Option 1: App-Specific Password
read -p "Do you want to use App-Specific Password? (y/n): " use_app_password

if [ "$use_app_password" = "y" ]; then
  echo ""
  echo "Step 1: Generate an app-specific password:"
  echo "  - Go to: https://appleid.apple.com/account/manage"
  echo "  - Sign in with your Apple ID"
  echo "  - Under 'Security' → 'App-Specific Passwords'"
  echo "  - Click 'Generate Password'"
  echo "  - Copy the password (you'll only see it once!)"
  echo ""
  
  read -p "Enter your Apple ID email: " apple_id
  read -sp "Enter your app-specific password: " app_password
  echo ""
  
  # Team ID from your certificate (ZJBVSAC8G7)
  TEAM_ID="ZJBVSAC8G7"
  PROFILE_NAME="brewmate-profile"
  
  echo ""
  echo "Storing credentials in keychain..."
  xcrun notarytool store-credentials "$PROFILE_NAME" \
    --apple-id "$apple_id" \
    --team-id "$TEAM_ID" \
    --password "$app_password"
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Successfully stored credentials as '$PROFILE_NAME'"
    echo ""
    echo "Next step: Uncomment the osxNotarize section in forge.config.js"
    echo "and set keychainProfile to '$PROFILE_NAME'"
  else
    echo ""
    echo "✗ Failed to store credentials. Please check your inputs."
  fi
else
  echo ""
  echo "To use App Store Connect API Key:"
  echo "1. Go to: https://appstoreconnect.apple.com/access/api"
  echo "2. Click 'Keys' tab → 'Generate API Key'"
  echo "3. Download the .p8 file (can only be downloaded once!)"
  echo "4. Note the Key ID and Issuer ID"
  echo ""
  echo "Then run:"
  echo "  xcrun notarytool store-credentials brewmate-profile \\"
  echo "    --key-path /path/to/AuthKey_XXXXX.p8 \\"
  echo "    --key-id YOUR_KEY_ID \\"
  echo "    --issuer YOUR_ISSUER_UUID"
fi

