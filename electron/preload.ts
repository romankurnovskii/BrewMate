import { app, contextBridge, ipcRenderer } from 'electron';
import { BrewCLICommands } from '../src/data/constants';
import { execWrapper, spawnWrapper } from './cli';
import { mergeAllCasks } from './helpers';
import { IApp } from '../src/types/apps';

mergeAllCasks().then((casksDict) => {
  ipcRenderer.invoke('save-fetched-casks', casksDict);
});

contextBridge.exposeInMainWorld('brewApi', {
  getAllCasks: async (callback?: any): Promise<Record<string, IApp>> => {
    return ipcRenderer.invoke('get-fetched-casks');
  },
  getInstalled: async () => {
    const command = BrewCLICommands.GET_INSTALLED_CASKS_JSON_OUTPUT;
    const res = await execWrapper(command);
    const newLocal = JSON.parse(res) as { casks: any; formulae: any };
    const casks: any = newLocal['casks'];
    const formulae: any = newLocal['formulae'];
    return [casks, formulae];
  },
  installCask: async (appToken: string, callback?: any): Promise<any> => {
    const commandStr = `brew install --cask --force ${appToken}`;
    const command = commandStr.split(' ');
    const res = await spawnWrapper(command, callback);
    return res;
  },
  unInstallCask: async (appToken: string, callback?: any) => {
    const commandStr = `brew uninstall --cask --force ${appToken}`;
    const command = commandStr.split(' ');
    const res = await spawnWrapper(command, callback);
    return res;
  },
  update: async (callback: any): Promise<any> => {
    const commandStr = BrewCLICommands.UPDATE;
    const command = commandStr.split(' ');
    const res = await spawnWrapper(command, callback);
    return res;
  },
  upgrade: async (callback: any): Promise<any> => {
    const commandStr = BrewCLICommands.UPGRADE;
    const command = commandStr.split(' ');
    const res = await spawnWrapper(command, callback);
    return res;
  },
  upgradeAll: async (callback: any): Promise<any> => {
    const commandStr = BrewCLICommands.UPGRADE_ALL;
    const commands = commandStr.split(';').map((cmd) => cmd.trim().split(' '));
    let res;
    for (const command of commands) {
      res = await spawnWrapper(command, callback);
    }
    return res;
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
