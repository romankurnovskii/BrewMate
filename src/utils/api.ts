import {
  BrewCLICommands,
  BrewCliCommandsNames,
  BREW_ALL_CASKS_DICT,
  BREW_ALL_CASKS_INSTALLED_DICT,
  BREW_ALL_FORMULAS_INSTALLED_DICT,
  HOMEBREW_CASKS_JSON_URL,
  HOMEBREW_TOP_DOWNLOADS_30D_JSON_URL,
} from '../data/constants';
import { IHomebrewApp, IHomebrewTopInstallResponse } from '../types/homebrew';
import { transformArrayToDict } from './helpers';
import { saveDataToStorage } from './storage';

export const fetchAllBrewGUIApps = async (): Promise<IHomebrewApp[]> => {
  const response = await fetch(HOMEBREW_CASKS_JSON_URL, { cache: 'no-store' });
  const data = await response.json();
  return data;
};

export const fetchTopInstalls30Days =
  async (): Promise<IHomebrewTopInstallResponse> => {
    const response = await fetch(HOMEBREW_TOP_DOWNLOADS_30D_JSON_URL);
    const data = await response.json();
    return data;
  };

export const updateAllCasks = async () => {
  const fetchedCasks = await fetchAllBrewGUIApps();
  const transformed = transformArrayToDict(fetchedCasks, 'token');
  saveDataToStorage(BREW_ALL_CASKS_DICT, transformed);
  return fetchedCasks;
};

export const getLocalInstalledApps = async () => {
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
        console.log(51, BrewCLICommands.UPDATE);
        return window.brewApi.update(handleCommandOutput);
      case BrewCLICommands.UPGRADE:
        console.log(514, BrewCLICommands.UPGRADE);
        return window.brewApi.update(handleCommandOutput);
      default:
        throw new Error('Current command not supported');
    }
  } else {
    throw new Error('Invalid command');
  }
};
