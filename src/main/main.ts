import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipcHandlers';
import { logCommand } from '../utils/logger';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Pantry',
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
  app.setName('Pantry');

  // Log app startup
  logCommand('Pantry started', undefined, undefined);
  console.log('[Main] Pantry starting...');

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
