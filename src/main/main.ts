import { app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipcHandlers';
import { logCommand } from '../utils/logger';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  // Set app icon using nativeImage for better cross-platform support
  // According to Electron docs: https://www.electronjs.org/docs/latest/api/native-image
  // The build.mac.icon in package.json handles the app bundle icon (electron-builder)
  // Here we set the window icon and dock icon

  let iconPath: string | null = null;
  const fs = require('fs');

  if (process.platform === 'darwin') {
    // On macOS, try to find .icns file (better quality)
    // In development: dist/../build/icon.icns
    // In packaged app: Resources/../build/icon.icns or app.asar
    const possiblePaths = [
      path.join(__dirname, '../../build/icon.icns'), // Development
      path.join(process.resourcesPath, 'build/icon.icns'), // Packaged
      path.join(app.getAppPath(), 'build/icon.icns'), // Alternative packaged path
    ];

    for (const testPath of possiblePaths) {
      try {
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }
  }

  // Fallback to PNG icon
  if (!iconPath) {
    const pngPaths = [
      path.join(__dirname, '../assets/icon-raw.png'), // Development
      path.join(process.resourcesPath, 'assets/icon-raw.png'), // Packaged
      path.join(app.getAppPath(), 'assets/icon-raw.png'), // Alternative
    ];

    for (const testPath of pngPaths) {
      try {
        if (fs.existsSync(testPath)) {
          iconPath = testPath;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
  }

  // Create NativeImage instance for better icon handling
  // nativeImage.createFromPath() supports PNG, JPEG, and .icns on macOS
  const appIcon = iconPath
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  // Set app icon globally (affects dock icon on macOS)
  // This ensures the dock shows the custom icon instead of Electron default
  if (!appIcon.isEmpty() && process.platform === 'darwin') {
    app.dock?.setIcon(appIcon);
  }

  // BrowserWindow icon accepts: string | NativeImage | undefined (not null)
  // Convert null to undefined to match the expected type
  const windowIcon:
    | string
    | ReturnType<typeof nativeImage.createFromPath>
    | undefined = appIcon.isEmpty() ? iconPath || undefined : appIcon;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'BrewMate',
    icon: windowIcon,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load HTML file from dist directory
  const htmlPath = path.join(__dirname, '../renderer/index.html');
  console.log('[Main] Loading HTML from:', htmlPath);

  // Open DevTools only in development
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(htmlPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Register Cmd-J shortcut - setup immediately and also after load
  const setupCmdJ = () => {
    mainWindow?.webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'j' &&
        (input.meta || input.control) &&
        input.type === 'keyDown'
      ) {
        event.preventDefault();
        console.log('[Main] Cmd+J pressed, toggling terminal');
        mainWindow?.webContents.send('toggle-terminal');
      }
    });
  };

  // Setup immediately
  setupCmdJ();

  // Also setup after window loads (backup)
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[Main] Window loaded, Cmd+J shortcut should be active');
  });
}

function initializeApp(): void {
  // Set app name
  app.setName('BrewMate');

  // Log app startup
  logCommand('BrewMate started', undefined, undefined);
  console.log('[Main] BrewMate starting...');

  // Setup IPC handlers BEFORE creating window
  console.log('[Main] Setting up IPC handlers...');
  setupIpcHandlers();
  console.log('[Main] IPC handlers set up');

  // Create window when ready
  app.whenReady().then(() => {
    console.log('[Main] App ready, creating window...');
    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
}

// Initialize the app
initializeApp();
