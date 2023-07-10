import { exec, spawn } from 'child_process';
import { log } from './log';
import { IHomebrewApp } from '../src/types/homebrew';

enum BrewCLICommands { // TODO moved from src
  GET_ALL_CASK_NAMES = 'brew search --casks . | grep -v "font-"',
  GET_INSTALLED_CASKS_JSON_OUTPUT = 'brew info --installed --casks --json=v2',
  GET_INSTALLED_FORMULAS_JSON_OUTPUT = 'brew info --installed --formula --json=v2',
  GET_CASK_INFO = 'brew info --json=v2 --cask ',
  UPDATE = 'brew update',
  UPGRADE = 'brew upgrade',
  UPGRADE_ALL = 'brew update; brew upgrade; brew cu --all --cleanup --force --yes',
  INSTALL_CASK = 'brew install --cask --force --no-quarantine',
  UNINSTALL_CASK = 'brew uninstall --cask --force',
  TAPS_ALL_INFO = 'brew tap-info --installed --json',
  TAPS = 'brew tap',
  OPEN_LOGS = 'OPEN_LOGS',
}

export const execWrapper = async (command: string): Promise<string> => {
  log('Started command: ' + command);
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        maxBuffer: 5 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        if (err) {
          log('Error: ' + err.message + '\n' + stderr);
          reject(err);
          return;
        }
        resolve(stdout);
      },
    );
  });
};

export const spawnWrapper = async (
  command: string[],
  callback: (data: string, error?: Error) => void,
): Promise<number> => {
  log('Started command: ' + [...command].join(' '));
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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace HomebrewCLI {
  export async function getAllCaskNames(): Promise<string[]> {
    const output = await execWrapper(BrewCLICommands.GET_ALL_CASK_NAMES);
    return output.split('\n').filter((line) => line.length > 0);
  }

  export async function getInstalledCasksJsonOutput(): Promise<
    [IHomebrewApp[], any[]]
  > {
    const command = BrewCLICommands.GET_INSTALLED_CASKS_JSON_OUTPUT;
    const res = await execWrapper(command);
    const newLocal = JSON.parse(res) as { casks: any; formulae: any };
    const casks: IHomebrewApp[] = newLocal['casks'];
    const formulae: any = newLocal['formulae'];
    return [casks, formulae];
  }

  export async function getInstalledFormulasJsonOutput(): Promise<string> {
    return execWrapper(BrewCLICommands.GET_INSTALLED_FORMULAS_JSON_OUTPUT);
  }

  export async function getCaskInfo(
    caskName: string,
  ): Promise<IHomebrewApp | any> {
    const stdout = await execWrapper(BrewCLICommands.GET_CASK_INFO + caskName);

    const caskInfo = JSON.parse(stdout);

    if (caskInfo.casks.length > 0) {
      return caskInfo.casks[0];
    } else {
      throw new Error(`Could not find description for cask: ${caskName}`);
    }
  }

  export async function update(): Promise<number> {
    return spawnWrapper(['brew', 'update'], (data) => {});
  }

  export async function upgrade(): Promise<number> {
    return spawnWrapper(['brew', 'upgrade'], (data) => {});
  }

  export async function upgradeAll(): Promise<number> {
    return spawnWrapper(['brew', 'upgrade', '--all'], (data) => {});
  }
}
