import { exec, spawn } from 'child_process';
import { contextBridge, ipcRenderer } from 'electron';
import { BrewCLICommands } from '../src/data/constants';

const log = (data: string) => {
  ipcRenderer.send('save-data-to-logfile', data);
};

const execWrapper = async (command: string): Promise<string> => {
  log('Started command: ' + command);
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        log(err.message + '\n' + stderr);
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
  log('Started command: ' + [...command].toString());
  const child = spawn(command[0], command.slice(1));

  child.stdout.on('data', (data) => {
    log(data.toString());
    callback(data.toString());
  });

  child.stderr.on('data', (data) => {
    log(data.toString());
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
    const command = commandStr.split(' ');
    const res = await spawnWrapper(command, callback);
    return res;
  },
  getLocalTaps: async (callback: any): Promise<string[]> => {
    const command = BrewCLICommands.TAPS;
    const terminalOutput = await execWrapper(command);
    const res = terminalOutput.trim().split('\n');
    console.log(94, res);
    return res;
  },
  openLogs: async (callback: any): Promise<any> => {
    const logFilePath = await ipcRenderer.invoke('get-logfile-path');
    const commandStr = `open "${logFilePath}"`;
    const res = await execWrapper(commandStr);
    return res;
  },
});
