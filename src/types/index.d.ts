export {};

declare global {
  interface Window {
    brewApi: {
      getAllCasks: (callback?: any) => Promise<IAppsDict>;
      getCaskInfo: (caskToken: string, callback?: any) => Promise<IApp>;
      installCask: (appToken: string, callback?: any) => Promise<any>;
      uninstallCask: (appToken: string, callback?: any) => Promise<any>;
      getInstalled: () => Promise<[IApp[], any]>;
      update: (callback: any) => Promise<any>;
      upgrade: (callback: any) => Promise<any>;
      upgradeAll: (callback: any) => Promise<any>;
      getLocalTaps: (callback: any) => Promise<any>;
      openLogs: (callback?: any) => Promise<any>;
    };
    ipcRenderer: any;
  }
}
