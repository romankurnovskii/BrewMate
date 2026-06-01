import { ipcMain, IpcMainEvent, app } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import { fetchJSON } from '../utils/fetchData';
import { loadFromCache, saveToCache } from '../utils/cache';
import { getTerminalPromptInfo } from '../utils/terminal';
import { getInstalledApps, getOutdatedApps, getCacheSize, getAppDetails, scanVulnerabilities } from '../utils/brew';
import { logCommand, getLogFilePath } from '../utils/logger';
import { getEnvWithBrewPath } from '../utils/path';
import { HOMEBREW_CASKS_JSON_URL, HOMEBREW_FORMULAS_JSON_URL } from '../constants';
import { App, LoadingStatus } from '../types';

export function setupIpcHandlers(): void {
  // Get installed apps
  ipcMain.on('get-installed-apps', async (event: IpcMainEvent) => {
    console.log('[IPC] get-installed-apps received');
    try {
      const installed = await getInstalledApps();
      console.log('[IPC] Installed apps:', installed.length);
      event.reply('installed-apps', installed);
    } catch (error: any) {
      console.error('[IPC] Error getting installed apps:', error);
      event.reply('installed-apps-error', error.message);
      event.reply('installed-apps', []);
    }
  });

  // Get all available apps from Homebrew API with caching
  ipcMain.on('get-all-apps', async (event: IpcMainEvent) => {
    console.log('[IPC] get-all-apps received');
    try {
      // Try to load from cache first
      const cachedData = await loadFromCache();
      console.log(
        '[IPC] Cache check:',
        cachedData ? `Found ${cachedData.length} apps` : 'No cache'
      );

      // Send cached data immediately if available
      if (cachedData) {
        console.log('[IPC] Sending cached data to renderer');
        event.reply('all-apps', cachedData);
        event.reply('loading-status', {
          loading: false,
          message: 'Loaded from cache',
        } as LoadingStatus);
      } else {
        console.log('[IPC] No cache, fetching from API...');
        event.reply('loading-status', {
          loading: true,
          message: 'Fetching apps from Homebrew...',
        } as LoadingStatus);
      }

      // Fetch fresh data in background
      try {
        const [casks, formulas] = await Promise.all([
          fetchJSON(HOMEBREW_CASKS_JSON_URL),
          fetchJSON(HOMEBREW_FORMULAS_JSON_URL),
        ]);

        const allApps: App[] = [
          ...casks.map((cask: any) => ({
            name: cask.token || cask.name,
            description: cask.desc || '',
            homepage: cask.homepage || '',
            version: cask.version || 'N/A',
            type: 'cask' as const,
          })),
          ...formulas.map((formula: any) => ({
            name: formula.name,
            description: formula.desc || '',
            homepage: formula.homepage || '',
            version: formula.versions?.stable || 'N/A',
            type: 'formula' as const,
          })),
        ];

        // Save to cache
        saveToCache(allApps); // Optimization: Now async, runs in background to unblock main thread

        // Send fresh data (only if we didn't have cache, or update anyway)
        console.log('[IPC] Fetched apps:', allApps.length);
        if (!cachedData) {
          console.log('[IPC] Sending fresh data to renderer');
          event.reply('all-apps', allApps);
        } else {
          console.log('[IPC] Sending updated data to renderer');
          event.reply('all-apps-updated', allApps);
        }
        event.reply('loading-status', {
          loading: false,
          message: 'Apps loaded',
        } as LoadingStatus);
      } catch (error: any) {
        console.error('[IPC] Error fetching apps:', error);
        event.reply('loading-status', {
          loading: false,
          message: 'Error loading apps',
          error: error.message,
        } as LoadingStatus);
        // Send error details to renderer
        event.reply('all-apps-error', error.message);
        if (!cachedData) {
          event.reply('all-apps', []);
        }
      }
    } catch (error: any) {
      console.error('[IPC] Fatal error in get-all-apps:', error);
      event.reply('loading-status', {
        loading: false,
        message: 'Error',
        error: error.message,
      } as LoadingStatus);
      // Send error details to renderer
      event.reply('all-apps-error', error.message);
      event.reply('all-apps', []);
    }
  });

  // Install app
  ipcMain.on('install-app', (event: IpcMainEvent, appName: string, appType: string) => {
    const command =
      appType === 'cask'
        ? `brew install --cask --force ${appName}`
        : `brew install ${appName}`;

    console.log('[IPC] Installing app:', appName, appType);
    let output = '';
    logCommand(command);
    console.log('[IPC] Command logged:', command);

    const shell = spawn(command, [], {
      shell: true,
      cwd: process.env.HOME || process.cwd(),
      env: getEnvWithBrewPath(),
    });

    shell.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.stderr.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.on('close', (code) => {
      logCommand(command, output, code);
      event.reply('install-complete', { appName, success: code === 0 });
      event.reply('terminal-output', `\nProcess exited with code ${code}\n`);
    });
  });

  // Uninstall app
  ipcMain.on('uninstall-app', (event: IpcMainEvent, appName: string, appType: string) => {
    const command =
      appType === 'cask'
        ? `brew uninstall --cask --force ${appName}`
        : `brew uninstall --force ${appName}`;

    let output = '';
    logCommand(command);

    const shell = spawn(command, [], {
      shell: true,
      cwd: process.env.HOME || process.cwd(),
      env: getEnvWithBrewPath(),
    });

    shell.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.stderr.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.on('close', (code) => {
      logCommand(command, output, code);
      event.reply('uninstall-complete', { appName, success: code === 0 });
      event.reply('terminal-output', `\nProcess exited with code ${code}\n`);
    });
  });

  // Get terminal prompt info
  ipcMain.on('get-terminal-prompt', (event: IpcMainEvent) => {
    const promptInfo = getTerminalPromptInfo();
    event.reply('terminal-prompt-info', promptInfo);
  });

  // Get log file path
  ipcMain.on('get-log-path', (event: IpcMainEvent) => {
    event.reply('log-path', getLogFilePath());
  });

  // Get asset path (for logo and other assets)
  ipcMain.on('get-asset-path', (event: IpcMainEvent, assetName: string) => {
    const fs = require('fs');

    // Standard path resolution based on app state
    let assetPath: string | null = null;

    if (app.isPackaged) {
      // Packaged app: assets in Resources/assets/
      assetPath = path.join(process.resourcesPath, 'assets', assetName);
    } else {
      // Development: assets in dist/assets/
      assetPath = path.join(__dirname, '../assets', assetName);
    }

    // Check if asset exists
    try {
      if (fs.existsSync(assetPath)) {
        console.log(`[IPC] Found asset at: ${assetPath}`);

        // Convert to file:// URL for use in HTML
        const normalizedPath = assetPath.replace(/\\/g, '/');
        const fileUrl = `file://${normalizedPath}`;
        event.reply('asset-path', { assetName, path: fileUrl });
      } else {
        console.warn(`[IPC] Asset not found: ${assetName} at ${assetPath}`);
        event.reply('asset-path', { assetName, path: null });
      }
    } catch (e) {
      console.error(`[IPC] Error checking asset ${assetName}:`, e);
      event.reply('asset-path', { assetName, path: null });
    }
  });

  // Get version info
  ipcMain.on('get-version-info', (event: IpcMainEvent) => {
    // Use Electron's built-in method to get version - works in both dev and packaged apps
    // This reads from package.json automatically
    const version = app.getVersion();

    // Try to get git commit hash (only works in development, not in packaged apps)
    let commit: string | undefined;
    try {
      const { execSync } = require('child_process');
      const path = require('path');

      // In development, use app.getAppPath() to get the project root
      // In packaged apps, this won't work (git won't be available), but that's fine
      const projectRoot = app.isPackaged
        ? app.getAppPath()
        : path.join(app.getAppPath(), '..');

      commit = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'ignore'], // Suppress stderr to avoid noise
      }).trim();
    } catch (error) {
      // Git not available or not in a git repo - ignore silently
      // This is expected in packaged apps
    }

    event.reply('version-info', { version, commit });
  });

  // Get outdated apps
  ipcMain.on('get-outdated-apps', async (event: IpcMainEvent) => {
    console.log('[IPC] get-outdated-apps received');
    try {
      const outdated = await getOutdatedApps();
      event.reply('outdated-apps', outdated);
    } catch (error: any) {
      console.error('[IPC] Error getting outdated apps:', error);
      event.reply('outdated-apps', []);
    }
  });

  // Get cache size
  ipcMain.on('get-cache-size', async (event: IpcMainEvent) => {
    console.log('[IPC] get-cache-size received');
    try {
      const size = await getCacheSize();
      event.reply('cache-size', size);
    } catch (error: any) {
      console.error('[IPC] Error getting cache size:', error);
      event.reply('cache-size', 0);
    }
  });

  // Get app details
  ipcMain.on('get-app-details', async (event: IpcMainEvent, appName: string, type: 'cask' | 'formula') => {
    console.log('[IPC] get-app-details received for:', appName);
    try {
      const details = await getAppDetails(appName, type);
      event.reply('app-details', { appName, details });
    } catch (error: any) {
      console.error('[IPC] Error getting app details:', error);
      event.reply('app-details', { appName, details: null });
    }
  });

  // Scan vulnerabilities
  ipcMain.on('scan-vulnerabilities', async (event: IpcMainEvent) => {
    console.log('[IPC] scan-vulnerabilities received');
    try {
      const vulns = await scanVulnerabilities();
      event.reply('vulnerabilities-result', vulns);
    } catch (error: any) {
      console.error('[IPC] Error scanning vulnerabilities:', error);
      event.reply('vulnerabilities-result', []);
    }
  });

  // Get trending apps
  ipcMain.on('get-trending-apps', async (event: IpcMainEvent) => {
    console.log('[IPC] get-trending-apps received');
    try {
      const [formulaData, caskData] = await Promise.all([
        fetchJSON('https://formulae.brew.sh/api/analytics/install/30d.json'),
        fetchJSON('https://formulae.brew.sh/api/analytics/cask-install/homebrew-cask/30d.json')
      ]);
      
      const combinedItems = [
        ...(formulaData?.items || []),
        ...(caskData?.items || [])
      ];
      
      event.reply('trending-apps-result', { items: combinedItems });
    } catch (error: any) {
      console.error('[IPC] Error getting trending apps:', error);
      event.reply('trending-apps-result', null);
    }
  });

  // Upgrade individual app
  ipcMain.on('upgrade-app', (event: IpcMainEvent, appName: string, appType: string) => {
    const command =
      appType === 'cask'
        ? `brew upgrade --cask ${appName}`
        : `brew upgrade ${appName}`;

    console.log('[IPC] Upgrading app:', appName, appType);
    let output = '';
    logCommand(command);

    const shell = spawn(command, [], {
      shell: true,
      cwd: process.env.HOME || process.cwd(),
      env: getEnvWithBrewPath(),
    });

    shell.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.stderr.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.on('close', (code) => {
      logCommand(command, output, code);
      event.reply('upgrade-complete', { appName, success: code === 0 });
      event.reply('terminal-output', `\nProcess exited with code ${code}\n`);
    });
  });

  // Upgrade all outdated apps
  ipcMain.on('upgrade-all', (event: IpcMainEvent) => {
    const command = `brew upgrade`;

    console.log('[IPC] Upgrading all outdated apps');
    let output = '';
    logCommand(command);

    const shell = spawn(command, [], {
      shell: true,
      cwd: process.env.HOME || process.cwd(),
      env: getEnvWithBrewPath(),
    });

    shell.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.stderr.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.on('close', (code) => {
      logCommand(command, output, code);
      event.reply('upgrade-all-complete', { success: code === 0 });
      event.reply('terminal-output', `\nProcess exited with code ${code}\n`);
    });
  });

  // Handle command execution
  ipcMain.on('execute-command', (event: IpcMainEvent, command: string) => {
    console.log('[IPC] Executing command:', command);
    let output = '';
    logCommand(command);
    console.log('[IPC] Command logged:', command);

    const shell = spawn(command, [], {
      shell: true,
      cwd: process.env.HOME || process.cwd(),
      env: getEnvWithBrewPath(),
    });

    shell.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.stderr.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      event.reply('terminal-output', dataStr);
    });

    shell.on('close', (code) => {
      logCommand(command, output, code);
      event.reply('terminal-output', `\nProcess exited with code ${code}\n`);
    });
  });
}
