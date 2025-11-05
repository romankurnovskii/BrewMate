export interface App {
  name: string;
  description: string;
  homepage: string;
  version: string;
  type: 'cask' | 'formula';
}

export interface InstalledApp {
  name: string;
  type: 'cask' | 'formula';
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
