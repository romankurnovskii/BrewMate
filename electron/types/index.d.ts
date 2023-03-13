export {};

declare global {
  interface Window {
    myAPI: any;
    ipcRenderer: any;
  }
}
