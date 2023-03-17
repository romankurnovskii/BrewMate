import { exec, spawn } from 'child_process';
import { contextBridge, ipcMain, ipcRenderer } from 'electron';
import { BrewCLICommands, BREW_INSTALLED_JSON } from '../src/data/constants';
import { logger, LOG_FILE_PATH } from './helpers';

const execWrapper = async (command: string): Promise<string> => {
  console.log('Started command: ' + command);
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
};

const spawnWrapper = async (
  command: string[],
  callback: (data: string, error?: Error) => void
): Promise<number> => {
  console.log('Started command: ' + [...command].toString());
  logger('Started command: ' + [...command].toString());
  const child = spawn(command[0], command.slice(1));

  child.stdout.on('data', (data) => {
    logger(data.toString());
    callback(data.toString());
  });

  child.stderr.on('data', (data) => {
    logger(data.toString());
    callback(data.toString(), new Error('Error occurred!'));
  });

  return new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve(code);
      }
    });
  });
};

contextBridge.exposeInMainWorld('brewApi', {
  getInstalled: async () => {
    const cmd = BREW_INSTALLED_JSON;
    const res = await execWrapper(cmd);
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
    const command = commandStr.split(' ');
    const res = await spawnWrapper(command, callback);
    return res;
  },
  openLogs: async (callback: any): Promise<any> => {
    const commandStr = 'open ' + LOG_FILE_PATH;
    const command = commandStr.split(' ');
    const res = await spawnWrapper(command, callback);
    return res;
  },
});
