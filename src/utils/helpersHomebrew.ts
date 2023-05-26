import { fetchAllBrewGUIApps, fetchTopInstalls90Days } from './api';
import { getAppCategory, transformArrayToDict } from './helpers';
import {
  IHomebrewApp,
  IHomebrewAppDict,
  IHomebrewTopInstallResponse,
} from '../types/homebrew';
import { saveDataToStorage } from './storage';
import { BREW_ALL_CASKS_DICT } from '../data/constants';
import { AppType, IApp } from '../types/apps';

export const updateAllCasks = async (): Promise<IHomebrewApp[]> => {
  const fetchedCasks = await fetchAllBrewGUIApps();
  const casksWithInstallsCount = await fetchTopInstalls90Days();

  const res = convertTopInstalledResponceToHomebrewApps(
    casksWithInstallsCount,
    fetchedCasks
  );
  return res;
};

export const convertTopInstalledResponceToHomebrewApps = (
  topInstallsApps: IHomebrewTopInstallResponse,
  allCasks: IHomebrewApp[]
): IHomebrewApp[] => {
  // convert to dict before merge operation
  const allCasksDict: IHomebrewAppDict = transformArrayToDict(
    allCasks,
    'token'
  );

  const apps = topInstallsApps['formulae'];
  Object.values(apps).forEach((app) => {
    const token = app[0]['cask'];
    const count = Number(app[0]['count'].replace(',', ''));
    if (allCasksDict[token]) {
      allCasksDict[token]['count'] = count;
    }
  });

  const res = Object.values(allCasksDict) as IHomebrewApp[];
  const sortedApps = sortAppsByInstalled(res);
  return sortedApps;
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

export const convertHomebrewAppstoCommonStructure = (
  apps: IHomebrewApp[]
): IApp[] => {
  return apps.map((app) => {
    const category = getAppCategory(app.name[0], app.desc);
    return {
      id: app.token,
      title: app.name[0],
      description: app.desc,
      categories: [category],
      installed: app.installed,
      homepage: app.homepage,
      appSourceType: AppType.Homebrew,
      sourceMetaData: { ...app },
    };
  });
};

export const sortAppsByInstalled = (apps: IHomebrewApp[]): IHomebrewApp[] => {
  const sortedApps = apps.sort((a, b) => {
    const countA = a.count ? a.count : 0;
    const countB = b.count ? b.count : 0;
    return countB - countA;
  });
  return sortedApps;
};

export const sortAppsByName = (apps: IHomebrewApp[]): IHomebrewApp[] => {
  return apps.sort((a, b) => {
    // Assuming the first element of the 'name' array is the primary name for sorting
    return a.name[0].localeCompare(b.name[0]);
  });
};
