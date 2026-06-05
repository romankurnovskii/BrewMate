import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { InstalledApp, OutdatedApp } from '../types';
import { getEnvWithBrewPath } from './path';

const execAsync = promisify(exec);

// Optimization: Parallelize file stat and directory traversal to significantly reduce I/O waiting time.
// Uses chunking (concurrency limit) to avoid EMFILE (too many open files) errors on large directories.
async function getDirSize(dirPath: string): Promise<number> {
  let totalSize = 0;
  try {
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const chunkSize = 50; // concurrency limit

    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      const sizes = await Promise.all(
        chunk.map(async (file) => {
          const resPath = path.join(dirPath, file.name);
          if (file.isDirectory()) {
            return getDirSize(resPath);
          } else if (file.isFile()) {
            const stat = await fs.promises.stat(resPath);
            return stat.size;
          }
          return 0;
        })
      );
      totalSize += sizes.reduce((acc, curr) => acc + curr, 0);
    }
  } catch (error) {
    // Ignore read errors
  }
  return totalSize;
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
    const { stdout } = await execAsync('brew outdated --greedy --json', { env });
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
    console.error('[Brew] Error getting installed apps:', error);
    return [];
  }
}

export async function getAppDetails(appName: string, type: 'cask' | 'formula'): Promise<any> {
  try {
    const env = getEnvWithBrewPath();
    const command =
      type === 'cask'
        ? `brew info --cask --json=v2 ${appName}`
        : `brew info --formula --json=v2 ${appName}`;
    const { stdout } = await execAsync(command, { env });
    const data = JSON.parse(stdout);

    if (type === 'cask' && data.casks && data.casks.length > 0) {
      return data.casks[0];
    } else if (type === 'formula' && data.formulae && data.formulae.length > 0) {
      return data.formulae[0];
    }
    return null;
  } catch (error) {
    console.error(`Error getting details for ${appName}:`, error);
    return null;
  }
}

export async function scanVulnerabilities(): Promise<any[]> {
  try {
    const env = getEnvWithBrewPath();
    const { stdout } = await execAsync('brew vulns --json', { env });
    const data = JSON.parse(stdout);
    return data;
  } catch (error) {
    console.error('Error scanning vulnerabilities:', error);
    return [];
  }
}
