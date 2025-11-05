export interface ElectronAPI {
  executeCommand: (command: string) => Promise<CommandResult>;
  onToggleTerminal: (callback: () => void) => void;
}

export interface CommandResult {
  stdout?: string;
  stderr?: string;
  error?: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
