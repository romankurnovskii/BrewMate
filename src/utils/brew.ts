import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { InstalledApp, OutdatedApp } from '../types';
import { getEnvWithBrewPath } from './path';

const execAsync = promisify(exec);

async function getDirSize(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const resPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += await getDirSize(resPath);
      } else if (file.isFile()) {
        const stat = await fs.promises.stat(resPath);
        size += stat.size;
      }
    }
  } catch (error) {
    // Ignore read errors
  }
  return size;
}

export async function getCacheSize(): Promise<number> {
  try {
    const env = getEnvWithBrewPath();
    const { stdout } = await execAsync('brew --cache', { env });
    const cachePath = stdout.trim();
    if (!cachePath) return 0;
    return await getDirSize(cachePath);
  } catch (error) {
    return 0;
  }
}

export async function getOutdatedApps(): Promise<OutdatedApp[]> {
  try {
    const env = getEnvWithBrewPath();
    const { stdout } = await execAsync('brew outdated --json', { env });
    const data = JSON.parse(stdout);
    const outdated: OutdatedApp[] = [];

    if (data.formulae) {
      for (const formula of data.formulae) {
        outdated.push({
          name: formula.name,
          type: 'formula',
          installedVersion: formula.installed_versions?.[0] || 'N/A',
          latestVersion: formula.current_version || 'N/A',
        });
      }
    }

    if (data.casks) {
      for (const cask of data.casks) {
        outdated.push({
          name: cask.name,
          type: 'cask',
          installedVersion: cask.installed_versions?.[0] || 'N/A',
          latestVersion: cask.current_version || 'N/A',
        });
      }
    }

    return outdated;
  } catch (error) {
    return [];
  }
}

export async function getInstalledApps(): Promise<InstalledApp[]> {
  try {
    const env = getEnvWithBrewPath();

    // Get installed casks (brew list --casks returns space-separated list)
    const { stdout: casksOutput } = await execAsync('brew list --casks', {
      env,
    });
    const installedCasks = casksOutput
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((cask) => cask.trim());

    // Get installed formulas
    const { stdout: formulasOutput } = await execAsync('brew list --formula', {
      env,
    });
    const installedFormulas = formulasOutput
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((formula) => formula.trim());

    return [
      ...installedCasks.map((cask: string) => ({
        name: cask,
        type: 'cask' as const,
      })),
      ...installedFormulas.map((formula: string) => ({
        name: formula,
        type: 'formula' as const,
      })),
    ];
  } catch (error) {
    return [];
  }
}
