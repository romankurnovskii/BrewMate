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

# FINAL BUILD COMMAND — NO CSC_NAME, NO --config.mas.identity
if [ "$1" = "universal" ]; then
  electron-builder build --mac mas:universal --dir=false --config.compression=maximum
else
  electron-builder build --mac mas --config.compression=maximum
fi

echo ""
echo "SUCCESS! Your MAS package is ready:"
echo "   dist-app/mas-universal/BrewMate.pkg"
echo ""
echo "Upload it via Transporter app or xcrun altool"