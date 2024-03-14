import { app, contextBridge, ipcRenderer } from 'electron';
import { BrewCLICommands } from '../src/data/constants';
import { execWrapper, spawnWrapper, executeCommandInTerminal } from './cli';
import { IApp, IAppsDict } from '../src/types/apps';

contextBridge.exposeInMainWorld('brewApi', {
  getAllCasks: async (callback?: any): Promise<IAppsDict> => {
    return ipcRenderer.invoke('get-all-casks');
  },
  getCaskInfo: async (caskToken: string, callback?: any): Promise<IApp> => {
    return ipcRenderer.invoke('get-cask-info', caskToken);
  },
  getInstalled: async (): Promise<[IApp[], any]> => {
    return ipcRenderer.invoke('get-installed-casks');
  },
  installCask: async (appToken: string, callback?: any): Promise<any> => {
    const commandStr = `brew install --cask --force --no-quarantine ${appToken}`;
    executeCommandInTerminal(commandStr);
    // const command = commandStr.split(' ');
    // const res = await spawnWrapper(command, callback);
    return 0;
  },
  uninstallCask: async (appToken: string, callback?: any) => {
    const commandStr = `brew uninstall --cask --force ${appToken}`;
    executeCommandInTerminal(commandStr);
    // const command = commandStr.split(' ');
    // const res = await spawnWrapper(command, callback);
    return 0;
  },
  update: async (callback: any): Promise<any> => {
    const commandStr = BrewCLICommands.UPDATE;
    const command = commandStr.split(' ');
    const res = await spawnWrapper(command, callback);
    return res;
  },
  upgrade: async (callback: any): Promise<any> => {
    const commandStr = BrewCLICommands.UPGRADE;
    executeCommandInTerminal(commandStr);
    // const command = commandStr.split(' ');
    // const res = await spawnWrapper(command, callback);
    return 0;
  },
  upgradeAll: async (callback: any): Promise<any> => {
    const commandStr = BrewCLICommands.UPGRADE_ALL;
    executeCommandInTerminal(commandStr)
    // const commands = commandStr.split(';').map((cmd) => cmd.trim().split(' '));
    // let res;
    // for (const command of commands) {
    //   res = await spawnWrapper(command, callback);
    // }
    return 0;
  },
  getLocalTaps: async (callback: any): Promise<string[]> => {
    const command = BrewCLICommands.TAPS;
    const terminalOutput = await execWrapper(command);
    const res = terminalOutput.trim().split('\n');
    return res;
  },
  openLogs: async (callback: any): Promise<any> => {
    const logFilePath = await ipcRenderer.invoke('get-logfile-path');
    const commandStr = `open "${logFilePath}"`;
    const res = await execWrapper(commandStr);
    return res;
  },
});
