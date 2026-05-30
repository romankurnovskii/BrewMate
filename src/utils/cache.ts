import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CACHE_DURATION } from '../constants';
import { App } from '../types';

const CACHE_DIR = path.join(os.homedir(), '.brewmate');
const CACHE_FILE = path.join(CACHE_DIR, 'apps-cache.json');

interface CacheData {
  timestamp: number;
  apps: App[];
}

export function getCachePath(): string {
  return CACHE_FILE;
}

export async function loadFromCache(): Promise<App[] | null> {
  try {
    // Optimization: Use asynchronous reading to avoid blocking Electron main thread
    // when loading large JSON cache files (~34MB for 100k apps)
    const cacheContent = await fs.promises.readFile(CACHE_FILE, 'utf8');
    const cache: CacheData = JSON.parse(cacheContent);
    const age = Date.now() - cache.timestamp;

    if (age < CACHE_DURATION) {
      return cache.apps;
    }
  } catch (e) {
    // Cache is corrupted or doesn't exist, ignore it
  }

  return null;
}

export async function saveToCache(apps: App[]): Promise<void> {
  try {
    // Optimization: Use asynchronous file operations to avoid blocking Electron main thread
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });

    const cacheData: CacheData = {
      timestamp: Date.now(),
      apps,
    };

    await fs.promises.writeFile(CACHE_FILE, JSON.stringify(cacheData), 'utf8');
  } catch (e) {
    // Handle or ignore cache save error
  }
}
