import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipcHandlers';
import { logCommand } from '../utils/logger';
import { initI18n, changeLanguage, t, getCurrentLanguage } from './i18n';

if (process.argv.includes('--test-startup') || process.env.TEST_STARTUP === 'true') {
  app.disableHardwareAcceleration();
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'BrewMate',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
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

  // Register Cmd-J shortcut - setup after window loads
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[Main] Window loaded, setting up Cmd+J shortcut');
    mainWindow?.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'j' && (input.meta || input.control) && input.type === 'keyDown') {
        event.preventDefault();
        console.log('[Main] Cmd+J pressed, toggling terminal');
        mainWindow?.webContents.send('toggle-terminal');
      }
    });
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

  // Initialize i18n
  console.log('[Main] Initializing i18n...');
  initI18n();
  console.log('[Main] i18n initialized');

  if (process.argv.includes('--test-startup') || process.env.TEST_STARTUP === 'true') {
    console.log('[Main] Startup smoke test passed successfully.');
    app.exit(0);
    return;
  }

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
