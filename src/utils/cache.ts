import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CACHE_DURATION } from '../constants';
import { App } from '../types';

const CACHE_DIR = path.join(os.homedir(), '.pantry');
const CACHE_FILE = path.join(CACHE_DIR, 'apps-cache.json');

interface CacheData {
  timestamp: number;
  apps: App[];
}

export function getCachePath(): string {
  return CACHE_FILE;
}

export function loadFromCache(): App[] | null {
  if (!fs.existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
    const cache: CacheData = JSON.parse(cacheContent);
    const age = Date.now() - cache.timestamp;

    if (age < CACHE_DURATION) {
      return cache.apps;
    }
  } catch (e) {
    // Cache is corrupted, ignore it
  }

  return null;
}

export function saveToCache(apps: App[]): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const cacheData: CacheData = {
    timestamp: Date.now(),
    apps,
  };

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData), 'utf8');
}
