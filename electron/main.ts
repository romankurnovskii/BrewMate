import { app, BrowserWindow, shell, ipcMain } from 'electron';
import installExtension, {
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import { exec } from 'child_process';
import fixPath from 'fix-path';
import * as path from 'path';
import {
  CASKS_DICT_FILE_NAME,
  CASKS_FILE_NAME,
  LOG_FILE_NAME,
} from './constants';
import { loadJson, logger, mergeAllCasks, saveJson } from './helpers';
import MenuBuilder from './menu';
import { IHomebrewApp } from '../src/types/homebrew';
import { fetchHomebrewCasks } from './api';

fixPath(); // works 3.0 version for now

const darkBackgroundColor = '#2e2c29';
const lightBackgroundColor = 'white';
const logFilePath = path.join(app.getPath('userData'), LOG_FILE_NAME);
// const casksFile = path.join(app.getPath('userData'), CASKS_FILE_NAME);
const casksDictFile = path.join(app.getPath('userData'), CASKS_DICT_FILE_NAME);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    show: false,
    // backgroundColor: nativeTheme.shouldUseDarkColors
    //   ? darkBackgroundColor
    //   : lightBackgroundColor,
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

  // nativeTheme.on('updated', () => {
  //   const backgroundColor = nativeTheme.shouldUseDarkColors
  //     ? darkBackgroundColor
  //     : lightBackgroundColor;

  //   mainWindow.setBackgroundColor(backgroundColor);
  // });

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

app.whenReady().then(() => {
  // DevTools
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));

  const currentVersion = app.getVersion();
  logger(logFilePath, `Current version of the app: ${currentVersion}`);

  createWindow();
  runInitCommands();
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

ipcMain.on('save-data-to-logfile', (event: any, data: any) => {
  logger(logFilePath, data);
});

ipcMain.handle('get-logfile-path', () => {
  return logFilePath;
});

ipcMain.handle('get-fetched-casks', (): Record<string, IHomebrewApp> => {
  try {
    return loadJson(casksDictFile);
  } catch (error) {
    mergeAllCasks();
    return {};
  }
});

ipcMain.handle('save-fetched-casks', (event: any, data: any) => {
  // saveJson(casksFile, data);
  // const casksDict = convertCasksArrayToDict(data);
  saveJson(casksDictFile, data);
});

const runInitCommands = () => {
  const command = 'brew update && brew tap buo/cask-upgrade';
  logger(logFilePath, 'Started command: ' + command);
  fetchHomebrewCasks();
  exec(command, (error, stdout, stderr) => {
    if (error) {
      logger(logFilePath, `Error executing the command: ${error.message}`);
      return;
    }
    logger(logFilePath, `Command output: ${stderr} ${stdout}`);
  });
};
