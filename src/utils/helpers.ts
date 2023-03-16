import { categories } from '../data/categories';
import { BREW_ALL_CASKS_DICT } from '../data/constants';
import { AppType, IApp } from '../types/apps';
import { IHomebrewApp, IHomebrewTopInstallResponse } from '../types/homebrew';
import { saveDataToStorage } from './storage';

// Define a function to match keywords in names and descriptions
const matchKeywords = (text: string, keywords: string[]): boolean => {
  for (const keyword of keywords) {
    if (text.toLowerCase().includes(keyword)) {
      return true;
    }
  }
  return false;
};

export const getAppCategory = (name: string, description: string) => {
  let category = 'Other';
  for (const [cat, keywords] of Object.entries(categories)) {
    if (matchKeywords(name + ' ' + description, keywords)) {
      category = cat;
      break;
    }
  }
  return category;
};

type ObjectWithKeyName = {
  [key: string]: any;
};
// transform array of objects to dict
// use object provided keyName as a key of dict
// expected for each object in array this keyName value is unique
export const transformArrayToDict = (
  objects: ObjectWithKeyName[],
  keyName: string
) => {
  const res: ObjectWithKeyName = {};
  objects.forEach((obj) => {
    res[obj[keyName]] = obj;
  });
  return res;
};

type IHomebrewAppDict = {
  [key: string]: IHomebrewApp;
};

interface IHomebrewTopAppInstalls extends IHomebrewApp {
  count: number;
}

export const convertTopInstalledResponceToHomebrewApps = (
  sourceApps: IHomebrewTopInstallResponse,
  compareAppsDict: IHomebrewAppDict
): IHomebrewTopAppInstalls[] => {
  const apps = sourceApps['formulae'];
  let res = [] as IHomebrewTopAppInstalls[];

  Object.values(apps).forEach((app) => {
    const token = app[0]['cask'];
    const count = Number(app[0]['count'].replace(',', ''));
    if (token) {
      const appData = compareAppsDict[token];
      if (appData) {
        res.push({ ...appData, count });
      }
    }
  });

  res.sort((a, b) => b.count - a.count);
  return res;
};

// Update installed status for all fetched apps
export const updateInstalledStatusApps = (
  allApps: IHomebrewApp[],
  installedApps: IHomebrewApp[]
): IHomebrewApp[] => {
  const installedDict = transformArrayToDict(installedApps, 'token');

  const updatedApps = allApps.map((app) => {
    const isInstalled = installedDict[app.token];

    if (isInstalled) {
      app = { ...app, ...isInstalled };
    }

    return app;
  });

  const transformedAllApps = transformArrayToDict(updatedApps, 'token');
  saveDataToStorage(BREW_ALL_CASKS_DICT, transformedAllApps);

  return updatedApps;
};

export const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const convertHomebrewAppstoCommonStructure = (
  apps: IHomebrewApp[]
): IApp[] => {
  return apps.map((app) => {
    return {
      id: app.token,
      title: app.name[0],
      description: app.desc,
      categories: [],
      installed: app.installed,
      homepage: app.homepage,
      appSourceType: AppType.Homebrew,
      sourceMetaData: { ...app },
    };
  });
};
