import { fetchAllBrewGUIApps, fetchTopInstalls30Days } from './api';
import { sortAppsByInstalled, transformArrayToDict } from './helpers';
import {
  IHomebrewApp,
  IHomebrewAppDict,
  IHomebrewTopInstallResponse,
} from '../types/homebrew';
import { saveDataToStorage } from './storage';
import { BREW_ALL_CASKS_DICT } from '../data/constants';

export const updateAllCasks = async (): Promise<IHomebrewApp[]> => {
  // fetch
  const fetchedCasks = await fetchAllBrewGUIApps();
  const casksWithInstallsCount = await fetchTopInstalls30Days();

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
  // res.sort((a, b) => {
  //   const countA = a.count ? a.count : 0;
  //   const countB = b.count ? b.count : 0;
  //   return countB - countA;
  // });

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
