#!/usr/bin/env node
/**
 * Configure Electron fuses for electron-builder
 * This script applies fuses to the Electron framework before code signing
 * Run this before building with electron-builder
 */

const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const path = require('path');
const fs = require('fs');

// Find Electron framework path
const electronPath = require('electron');
const frameworkPath = path.join(
  path.dirname(electronPath),
  'Electron Framework.framework',
  'Electron Framework',
);

// Check if framework exists
if (!fs.existsSync(frameworkPath)) {
  console.log('Electron Framework not found at:', frameworkPath);
  console.log('Fuses will be configured during build process');
  process.exit(0);
}

console.log('Configuring Electron fuses...');
console.log('Framework path:', frameworkPath);

try {
  flipFuses(frameworkPath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
  });
  console.log('✓ Fuses configured successfully');
} catch (error) {
  console.error('✗ Failed to configure fuses:', error.message);
  process.exit(1);
}
