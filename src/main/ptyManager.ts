// src/main/ptyManager.ts
// PTY manager for interactive cask upgrades that may require sudo
import { BrowserWindow, ipcMain } from 'electron';
import * as pty from 'node-pty';
import { getEnvWithBrewPath } from '../utils/path';
import { logCommand } from '../utils/logger';

// Simple PTY wrapper for a single concurrent upgrade
let activePty: pty.IPty | null = null;

// Helper to send data to the renderer (first BrowserWindow)
function sendToRenderer(channel: string, ...args: unknown[]) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && win.webContents) {
    win.webContents.send(channel, ...args);
  }
}

/**
 * Start a PTY for upgrading a single cask.
 * Returns a promise that resolves when the process exits.
 */
export async function startCaskUpgradePty(caskName: string): Promise<{ code: number }> {
  if (activePty) {
    throw new Error('Another upgrade is already in progress');
  }

  const command = `brew upgrade --cask ${caskName}`;
  logCommand(command);

  // Determine shell based on platform
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const shellArgs = process.platform === 'win32' ? [] : ['-c'];

  activePty = pty.spawn(shell, shellArgs.concat([command]), {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: process.env.HOME || process.cwd(),
    env: {
      ...process.env,
      ...getEnvWithBrewPath(),
    } as { [key: string]: string },
  });

  return new Promise<{ code: number }>((resolve) => {
    if (!activePty) {
      resolve({ code: 1 });
      return;
    }

    activePty.onData((data: string) => {
      sendToRenderer('pty-data', data);
      // Detect sudo error early
      if (/sudo: a (terminal|password) is required/.test(data)) {
        sendToRenderer('cask-sudo-required', caskName);
      }
    });

    activePty.onExit((exitInfo: { exitCode: number }) => {
      const code = exitInfo.exitCode ?? 0;
      sendToRenderer('pty-exit', { cask: caskName, code });
      activePty = null;
      resolve({ code });
    });
  });
}

/**
 * Feed keystrokes from renderer into the PTY.
 */
export function writeToPty(data: string): void {
  if (activePty) {
    activePty.write(data);
  }
}

/**
 * Check if a PTY is currently active.
 */
export function isPtyActive(): boolean {
  return activePty !== null;
}

/**
 * Kill the active PTY.
 */
export function killPty(): void {
  if (activePty) {
    activePty.kill();
    activePty = null;
  }
}

// Register IPC handlers
export function setupPtyIpcHandlers(): void {
  // Upgrade a single cask using PTY
  ipcMain.handle('upgrade-cask-pty', async (_event, caskName: string) => {
    return startCaskUpgradePty(caskName);
  });

  // Feed keystrokes from renderer to PTY
  ipcMain.on('pty-input', (_event, data: string) => {
    writeToPty(data);
  });

  // Check if PTY is active
  ipcMain.handle('is-pty-active', () => {
    return isPtyActive();
  });

  // Kill active PTY
  ipcMain.handle('kill-pty', () => {
    killPty();
    return true;
  });

  // Fallback: open an external terminal with the same brew command (macOS only).
  // On Linux/Windows the in-app PTY is the supported interactive path; soft-fail
  // with a clear error so the renderer can keep using embedded terminal input.
  ipcMain.handle('open-external-terminal', async (_event, caskName: string) => {
    if (process.platform !== 'darwin') {
      throw new Error(
        'Opening an external terminal is only supported on macOS. Use the in-app terminal to enter your password.'
      );
    }

    const cmd = `brew upgrade --cask ${caskName}`;
    const { execFile } = require('child_process');

    return new Promise<void>((resolve, reject) => {
      // Use execFile to avoid shell injection — arguments are passed literally
      // Double quotes within the AppleScript string must still be escaped
      const escapedCmd = cmd.replace(/"/g, '\\"');
      const script = `tell application "Terminal" to do script "${escapedCmd}"`;
      execFile('osascript', ['-e', script], (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}
