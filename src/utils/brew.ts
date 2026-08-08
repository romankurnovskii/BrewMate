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

function parseBrewListOutput(stdout: string): string[] {
  return stdout
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.trim());
}

export async function getInstalledApps(): Promise<InstalledApp[]> {
  try {
    const env = getEnvWithBrewPath();

    // Fetch casks and formulas independently so a cask-list failure (common on
    // Linux / limited Homebrew installs) does not wipe the formula list.
    const [casksSettled, formulasSettled] = await Promise.allSettled([
      execAsync('brew list --casks', { env }),
      execAsync('brew list --formula', { env }),
    ]);

    const installedCasks =
      casksSettled.status === 'fulfilled'
        ? parseBrewListOutput(casksSettled.value.stdout)
        : [];
    if (casksSettled.status === 'rejected') {
      console.error('[Brew] Error listing casks:', casksSettled.reason);
    }

    const installedFormulas =
      formulasSettled.status === 'fulfilled'
        ? parseBrewListOutput(formulasSettled.value.stdout)
        : [];
    if (formulasSettled.status === 'rejected') {
      console.error('[Brew] Error listing formulas:', formulasSettled.reason);
    }

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

/**
 * Fetch all cask names available from ALL installed taps (including third-party taps).
 * `brew search --casks` requires a query argument on modern Homebrew, so it cannot
 * enumerate every tap in one call (an empty query dies on untrusted taps). Instead we
 * list installed taps with `brew tap` and query each one individually via
 * `brew search --casks <tap>`, which lists that tap's casks (tap-qualified).
 * Returns the raw names as reported by brew. Names from third-party taps are
 * tap-qualified (e.g. "user/tap/caskname") — the caller can strip the prefix for
 * display but should keep it for `brew info --cask` lookups.
 */
export async function getAllTapCaskNames(): Promise<string[]> {
  try {
    const env = getEnvWithBrewPath();
    const { stdout: tapsOut } = await execAsync('brew tap', { env });
    const taps = tapsOut
      .trim()
      .split('\n')
      .map((tap) => tap.trim())
      .filter(Boolean);

    // Query each tap individually. Formula-only taps and untrusted taps exit
    // non-zero ("No formulae or casks found") — skip those silently.
    const outputs = await Promise.all(
      taps.map(async (tap) => {
        try {
          const { stdout } = await execAsync(`brew search --casks ${tap}`, { env });
          return stdout;
        } catch {
          return '';
        }
      })
    );

    const names: string[] = [];
    for (const stdout of outputs) {
      // With --casks, brew should only emit cask names. Track section headers
      // defensively so a "==> Formulae" section can never leak formula names in.
      let inCasksSection = true;
      for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Skip brew notices (upgrade warnings, errors, etc.) — they are not cask names.
        if (/^(Warning|Error|Note):/i.test(trimmed)) continue;
        if (trimmed.startsWith('==>')) {
          inCasksSection = trimmed.toLowerCase().includes('cask');
          continue;
        }
        if (inCasksSection) {
          names.push(
            ...trimmed
              .split(/\s+/)
              .filter(Boolean)
              .map((name) => name.trim())
          );
        }
      }
    }
    // Different taps could theoretically report the same cask name.
    return [...new Set(names)];
  } catch (error) {
    console.error('[Brew] Error fetching tap cask names:', error);
    return [];
  }
}

/**
 * Fetch details for a single cask that exists only in a third-party tap
 * (not in the official Homebrew API).
 * Uses `brew info --cask --json=v2` to get name, desc, homepage, and version.
 */
export async function getThirdPartyCaskInfo(caskName: string): Promise<any | null> {
  try {
    const env = getEnvWithBrewPath();
    const { stdout } = await execAsync(`brew info --cask --json=v2 ${caskName}`, { env });
    const data = JSON.parse(stdout);
    if (data.casks && data.casks.length > 0) {
      return data.casks[0];
    }
    return null;
  } catch (error) {
    // Cask info not available — skip silently
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
