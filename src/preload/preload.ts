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
  'get-outdated-apps',
  'get-cache-size',
  'upgrade-app',
  'upgrade-all',
  'get-brew-services',
  'execute-service-action',
];

const validReceiveChannels = [
  'toggle-terminal',
  'terminal-output',
  'all-apps',
  'all-apps-error',
  'all-apps-updated',
  'installed-apps',
  'installed-apps-error',
  'install-complete',
  'uninstall-complete',
  'loading-status',
  'terminal-prompt-info',
  'log-path',
  'version-info',
  'outdated-apps',
  'cache-size',
  'upgrade-complete',
  'upgrade-all-complete',
  'brew-services-list',
  'service-action-complete',
  'app-details',
  'asset-path',
  'trending-apps-result',
  'vulnerabilities-result',
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
