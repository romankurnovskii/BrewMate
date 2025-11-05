import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  executeCommand: (command: string) => {
    return ipcRenderer.invoke('execute-command', command);
  },
  onToggleTerminal: (callback: () => void) => {
    ipcRenderer.on('toggle-terminal', callback);
  },
});
