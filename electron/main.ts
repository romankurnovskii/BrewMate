import { app, BrowserWindow, shell, ipcMain } from 'electron';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import { exec } from 'child_process';
import * as path from 'path';
import {
  CASKS_DICT_FILE_PATH,
  CASKS_FILE_PATH,
  LOG_FILE_PATH,
} from './constants';
import { ensureDirnameExistsSync, loadJson, logger, saveJson } from './helpers';
import MenuBuilder from './menu';
import { fetch3rdPartyCasksMeta, fetchCasks, fetchPopularCasks } from './api';
import { HomebrewCLI } from './cli';
import {
  convertCask2IApp,
  convertCasks2IAppsDict,
  convertNamesToCasks,
  mergeCasks,
  updateInstallCountsIHomebrew,
} from './helpers/casks';
import { IApp, IAppsDict } from '../src/types/apps';

// Dynamically import fix-path as an ES module
import('fix-path').then((fixPath) => {
  fixPath.default(); // Call the default function provided by fix-path
});

const lightBackgroundColor = 'white';

ensureDirnameExistsSync(LOG_FILE_PATH);
ensureDirnameExistsSync(CASKS_FILE_PATH);
ensureDirnameExistsSync(CASKS_DICT_FILE_PATH);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    show: false,
    backgroundColor: lightBackgroundColor,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000/index.html');
    mainWindow.webContents.openDevTools();

    // Hot Reloading on 'node_modules/.bin/electronPath'
    import('electron-reload').then((electronReload: any) => {
      // TODO TypeError: electronReload is not a function
      electronReload(__dirname, {
        electron: path.join(
          __dirname,
          '..',
          '..',
          'node_modules',
          '.bin',
          'electron' + (process.platform === 'win32' ? '.cmd' : ''),
        ),
        forceHardReset: true,
        hardResetMethod: 'exit',
      });
    });
  }

  // Mac OS Menu
  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

const runInitCommands = async () => {
  // fetch all casks
  // get all casks names from local taps
  // merge all casks into one dict
  // convert each to common interface IAPP
  // save to json

  const casks = await fetchCasks();
  logger('Fetched Casks:' + casks.length);
  const popularCasks = await fetchPopularCasks();

  const allCaskNames = await HomebrewCLI.getAllCaskNames();

  let [allCasks, allCasksDict] = mergeCasks(
    convertNamesToCasks(allCaskNames),
    casks,
  );

  logger('[DEBUG]: Merged allCasks:' + allCasks.length);

  allCasksDict = updateInstallCountsIHomebrew(allCasksDict, popularCasks);
  const appsDict = convertCasks2IAppsDict(allCasks);

  // try to fix/set casks with empty desk
  const thirdPartyCasks = await fetch3rdPartyCasksMeta();
  const _thirdPartyCasks = thirdPartyCasks['releaseOnly'];
  Object.values(appsDict).forEach((app) => {
    if (app.description === '') {
      for (const _cask of _thirdPartyCasks) {
        if (_cask['repo'].toLowerCase().includes(app.id)) {
          appsDict[app.id].description = _cask.description;
          break;
        }
      }
    }
  });

  saveJson(CASKS_DICT_FILE_PATH, appsDict);
  logger('Updated first init casks dict to ' + CASKS_DICT_FILE_PATH);
  logger('Casks: ' + allCasks.length);
  const command = 'brew update && brew tap buo/cask-upgrade';
  logger('Started command: ' + command);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      logger(`[ERROR] Command execution failed: ${error.message}`);
      return;
    }
    logger(`Command output: ${stderr} ${stdout}`);
  });
};

const initApp = async () => {
  app.whenReady().then(async () => {
    // DevTools
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));

    const currentVersion = app.getVersion();
    logger(`Current version of the app: ${currentVersion}`);

    try {
      await runInitCommands();
    } catch (error) {
      logger(`Error executing the init commands: ${error}`);
    }
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
};

const initAppAPI = () => {
  ipcMain.handle('get-all-casks', (): IAppsDict => {
    try {
      return loadJson(CASKS_DICT_FILE_PATH);
    } catch (error) {
      logger('[ERROR] ' + error);
      return {};
    }
  });

  ipcMain.handle(
    'get-cask-info',
    async (event: any, caskToken: any): Promise<IApp | null> => {
      try {
        const allCasks = loadJson(CASKS_DICT_FILE_PATH);
        const cask = await HomebrewCLI.getCaskInfo(caskToken);
        if (cask) {
          const caskApp = convertCask2IApp(cask);
          allCasks[caskApp.id] = caskApp;
          saveJson(CASKS_DICT_FILE_PATH, allCasks);
          return caskApp;
        }

        return allCasks[caskToken];
      } catch (error) {
        logger('[ERROR] ' + error);
        return null;
      }
    },
  );

  ipcMain.handle('get-installed-casks', async (): Promise<[IApp[], any]> => {
    try {
      const [casks, formulas] = await HomebrewCLI.getInstalledCasksJsonOutput();
      const installedCasksDict = convertCasks2IAppsDict(casks);

      const allCasks = loadJson(CASKS_DICT_FILE_PATH);
      for (const [caskId, value] of Object.entries(installedCasksDict)) {
        const cask = allCasks[caskId];
        if (!cask) {
          logger(
            '[ERROR] Cant find installed cask from all casks. Cask id:' +
              caskId,
          );
        } else {
          allCasks[caskId]['installed'] = value['installed'];
        }
      }

      return [Object.values(installedCasksDict), formulas];
    } catch (error) {
      logger('[ERROR] ' + error);
      return [[], []];
    }
  });

  ipcMain.handle('save-fetched-casks', (event: any, data: any) => {
    saveJson(CASKS_DICT_FILE_PATH, data);
  });

  ipcMain.on('save-data-to-logfile', (event: any, data: any) => {
    logger(data);
  });

  ipcMain.handle('get-logfile-path', () => {
    return LOG_FILE_PATH;
  });
};

const startApp = async () => {
  await initApp();
  initAppAPI();
};

startApp();
