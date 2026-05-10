import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const validSendChannels = [
  'get-version-info',
  'install-app',
  'uninstall-app',
  'execute-command',
  'get-all-apps',
  'get-installed-apps',
  'get-terminal-prompt',
  'get-log-path',
];

const validReceiveChannels = [
  'toggle-terminal',
  'terminal-output',
  'all-apps',
  'installed-apps',
  'install-complete',
  'uninstall-complete',
  'loading-status',
  'all-apps-updated',
  'terminal-prompt-info',
  'log-path',
  'version-info',
];

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, ...data: any[]) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...data);
    }
  },
  on: (channel: string, func: (...args: any[]) => void) => {
    if (validReceiveChannels.includes(channel)) {
      // Pass null for event to match existing signatures in renderer expecting (_event, data)
      ipcRenderer.on(channel, (event: IpcRendererEvent, ...args: any[]) =>
        func(null, ...args)
      );
    }
  },
});
