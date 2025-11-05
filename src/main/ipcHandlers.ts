import { ipcMain, IpcMainEvent } from 'electron';
import { spawn } from 'child_process';
import { fetchJSON } from '../utils/fetchData';
import { loadFromCache, saveToCache } from '../utils/cache';
import { getTerminalPromptInfo } from '../utils/terminal';
import { getInstalledApps } from '../utils/brew';
import { logCommand, getLogFilePath } from '../utils/logger';
import { getEnvWithBrewPath } from '../utils/path';
import {
  HOMEBREW_CASKS_JSON_URL,
  HOMEBREW_FORMULAS_JSON_URL,
} from '../constants';
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
      event.reply('installed-apps', []);
    }
  });

  // Get all available apps from Homebrew API with caching
  ipcMain.on('get-all-apps', async (event: IpcMainEvent) => {
    console.log('[IPC] get-all-apps received');
    try {
      // Try to load from cache first
      const cachedData = loadFromCache();
      console.log(
        '[IPC] Cache check:',
        cachedData ? `Found ${cachedData.length} apps` : 'No cache',
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
        saveToCache(allApps);

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
      event.reply('all-apps', []);
    }
  });

  // Install app
  ipcMain.on(
    'install-app',
    (event: IpcMainEvent, appName: string, appType: string) => {
      const command =
        appType === 'cask'
          ? `brew install --cask --no-quarantine --force ${appName}`
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
    },
  );

  // Uninstall app
  ipcMain.on(
    'uninstall-app',
    (event: IpcMainEvent, appName: string, appType: string) => {
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
    },
  );

  // Get terminal prompt info
  ipcMain.on('get-terminal-prompt', (event: IpcMainEvent) => {
    const promptInfo = getTerminalPromptInfo();
    event.reply('terminal-prompt-info', promptInfo);
  });

  // Get log file path
  ipcMain.on('get-log-path', (event: IpcMainEvent) => {
    event.reply('log-path', getLogFilePath());
  });

  // Get version info
  ipcMain.on('get-version-info', (event: IpcMainEvent) => {
    const fs = require('fs');
    const path = require('path');

    // Get package.json from project root (dist is 2 levels up from dist/src/main)
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    let version = '0.0.0';

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      version = packageJson.version || '0.0.0';
    } catch (error) {
      console.error('[IPC] Failed to read package.json:', error);
    }

    // Try to get git commit hash
    let commit: string | undefined;
    try {
      const { execSync } = require('child_process');
      // Get project root (2 levels up from dist/src/main)
      const projectRoot = path.join(__dirname, '../..');
      commit = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
        cwd: projectRoot,
      }).trim();
    } catch (error) {
      // Git not available or not in a git repo - ignore
    }

    event.reply('version-info', { version, commit });
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
