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
    const cacheContent = await fs.promises.readFile(CACHE_FILE, 'utf8');
    const cache: CacheData = JSON.parse(cacheContent);
    const age = Date.now() - cache.timestamp;

    if (age < CACHE_DURATION) {
      return cache.apps;
    }
  } catch (e) {
    // Cache doesn't exist, is corrupted, or failed to read. Ignore it.
  }

  return null;
}

export async function saveToCache(apps: App[]): Promise<void> {
  try {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
  } catch (e) {
    // Ignore if directory exists
  }

  const cacheData: CacheData = {
    timestamp: Date.now(),
    apps,
  };

  try {
    await fs.promises.writeFile(CACHE_FILE, JSON.stringify(cacheData), 'utf8');
  } catch (e) {
    // Ignore write errors
  }
}
