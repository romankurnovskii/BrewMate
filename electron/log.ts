import { ipcRenderer } from 'electron';

export const log = (data: string) => {
  ipcRenderer.send('save-data-to-logfile', data);
};
