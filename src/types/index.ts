export interface App {
  name: string;
  description: string;
  homepage: string;
  version: string;
  type: 'cask' | 'formula';
  _category?: string;
  _nameLower?: string;
  _searchStr?: string;
}

export interface InstalledApp {
  name: string;
  type: 'cask' | 'formula';
}

export interface OutdatedApp {
  name: string;
  type: 'cask' | 'formula';
  installedVersion: string;
  latestVersion: string;
}

export interface TerminalPromptInfo {
  username: string;
  hostname: string;
  dir: string;
}

export interface LoadingStatus {
  loading: boolean;
  message?: string;
  error?: string;
}

export interface InstallResult {
  appName: string;
  success: boolean;
}

export interface BrewService {
  name: string;
  status: 'started' | 'stopped' | 'error' | 'unknown' | 'none';
  user: string | null;
  plist: string | null;
  file?: string;
}

export type {
  Software,
  SoftwareQuery,
  SoftwareUpdatePayload,
  SoftwareEvent,
} from './software';
