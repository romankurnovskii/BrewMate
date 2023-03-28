import {
  BrewCLICommands,
  BrewCliCommandsNames,
  BREW_ALL_CASKS_INSTALLED_DICT,
  BREW_ALL_FORMULAS_INSTALLED_DICT,
  HOMEBREW_CASKS_JSON_URL,
  HOMEBREW_TOP_DOWNLOADS_30D_JSON_URL,
  OSS_APPS_JSON_URL,
  OSS_CATEGORIES_JSON_URL,
} from '../data/constants';
import { IHomebrewApp, IHomebrewTopInstallResponse } from '../types/homebrew';
import { transformArrayToDict } from './helpers';
import { saveDataToStorage } from './storage';
import { IOpenSourceApp } from '../types/opensource-apps';

export const fetchAllBrewGUIApps = async (): Promise<IHomebrewApp[]> => {
  const response = await fetch(HOMEBREW_CASKS_JSON_URL, { cache: 'no-store' });
  const data = await response.json();
  return data;
};

export const fetchTopInstalls30Days =
  async (): Promise<IHomebrewTopInstallResponse> => {
    const response = await fetch(HOMEBREW_TOP_DOWNLOADS_30D_JSON_URL, {
      cache: 'no-store',
    });
    const data = await response.json();
    return data;
  };

export const getLocalInstalledApps = async (): Promise<IHomebrewApp[]> => {
  const [installedCasks, installedFormulas] =
    await window.brewApi.getInstalled();

  const casksAsDict = transformArrayToDict(installedCasks, 'token');
  saveDataToStorage(BREW_ALL_CASKS_INSTALLED_DICT, casksAsDict);

  const formulasAsDict = transformArrayToDict(installedFormulas, 'name');
  saveDataToStorage(BREW_ALL_FORMULAS_INSTALLED_DICT, formulasAsDict);

  return installedCasks;
};

export const runHomebrewCommand = async (
  command: BrewCLICommands,
  handleCommandOutput: any
) => {
  if (BrewCliCommandsNames[command]) {
    switch (command) {
      case BrewCLICommands.UPDATE:
        return window.brewApi.update(handleCommandOutput);
      case BrewCLICommands.UPGRADE:
        return window.brewApi.upgrade(handleCommandOutput);
      case BrewCLICommands.UPGRADE_ALL:
        return window.brewApi.upgradeAll(handleCommandOutput);
      case BrewCLICommands.TAPS:
        return window.brewApi.getLocalTaps(handleCommandOutput);
      case BrewCLICommands.OPEN_LOGS:
        return window.brewApi.openLogs(handleCommandOutput);
      default:
        throw new Error('Current command not supported');
    }
  } else {
    throw new Error('Invalid command');
  }
};

// ------------------ Open Source Apps source from github

export const fetchAppsCategoriesFromSerhiiLondarOSMAC = async (): Promise<any[]
> => {
  const response = await fetch(OSS_CATEGORIES_JSON_URL, {
    cache: 'no-store',
  });
  const data = await response.json();
  const categories = data.categories;
  return categories;
};

export const fetchAppsFromSerhiiLondarOSMAC = async (): Promise<IOpenSourceApp[]
> => {
  const response = await fetch(OSS_APPS_JSON_URL, {
    cache: 'no-store',
  });
  const data = await response.json();
  const apps = data.applications;
  return apps;
};
