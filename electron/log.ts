import { ipcRenderer } from 'electron';

export const log = (data: string) => {
  if (ipcRenderer) {
    ipcRenderer.send('save-data-to-logfile', data);
  } else {
    console.log(data);
  }
};
