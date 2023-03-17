export {};

declare global {
  interface Window {
    brewApi: {
      installCask: (appToken: string, callback?: any) => Promise<any>;
      unInstallCask: (appToken: string, callback?: any) => Promise<any>;
      getInstalled: () => Promise<[any, any]>;
      update: (callback: any) => Promise<any>;
      upgrade: (callback: any) => Promise<any>;
      upgradeAll: (callback: any) => Promise<any>;
      openLogs: (callback?: any) => Promise<any>;
    };
    ipcRenderer: any;
  }
}
