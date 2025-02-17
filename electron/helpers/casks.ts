import { HomebrewCLI } from '../cli';
import { transformArrayToDict } from '../helpers';
import { AppType, IApp, IAppsDict } from '../../src/types/apps';
import {
  IHomebrewApp,
  IHomebrewAppDict,
  IHomebrewTopInstallResponse,
} from '../../src/types/homebrew';
import { getAppCategory } from '../../src/utils/helpers';

export const getCaskInfo = async (caskName: string): Promise<IHomebrewApp> => {
  if (caskName.startsWith('font-')) {
    return getCaskInfoTemplate(caskName);
  }
  return HomebrewCLI.getCaskInfo(caskName);
};

export const getCaskInfoTemplate = (caskName: string): IHomebrewApp => {
  console.debug('Executing getCaskInfoTemplate', caskName);
  let description = '';
  if (caskName.startsWith('font-')) {
    description = caskName;
  }
  const removePrefix = (str: string): string => {
    const caskName = str.split('/').pop();
    return caskName ?? str;
  };
  const _token = removePrefix(caskName);
  return {
    token: _token,
    desc: '',
    homepage: '',
    version: '',
    installed: '',
    name: [_token],
    url: '',
    outdated: false,
  };
};

export const createCaskFromName = (
  caskName: string,
  description: string | null = null,
): IHomebrewApp => {
  if (!description) {
    description = '';
  }

  const removePrefix = (str: string): string => {
    const caskName = str.split('/').pop();
    return caskName ?? str;
  };

  const _token = removePrefix(caskName);

  return {
    token: _token,
    desc: description,
    homepage: '',
    installed: null,
    name: [_token],
    url: '',
    version: '',
    outdated: false,
  };
};

export const updateCask = (
  oldCask: IHomebrewApp,
  newCask: IHomebrewApp,
): IHomebrewApp => {
  return {
    ...oldCask,
    ...newCask,
  };
};

export const convertNamesToCasks = (caskNames: string[]): IHomebrewApp[] => {
  const casks = [];

  // fetch https://raw.githubusercontent.com/romankurnovskii/homebrew-awesome-brew/main/casks.json
  // ['releaseOnly']
  // match cask name to repo

  for (let caskName of caskNames) {
    caskName = caskName.trim();
    const cask = createCaskFromName(caskName);
    casks.push(cask);
  }
  return casks;
};

export const mergeCasks = (
  casksOld: IHomebrewApp[],
  casksNew: IHomebrewApp[],
): [IHomebrewApp[], IHomebrewAppDict] => {
  const casksOldDict = transformArrayToDict(casksOld, 'token');
  const casksNewDict = transformArrayToDict(casksNew, 'token');

  for (let [token, cask2] of Object.entries(casksNewDict)) {
    const cask1 = casksOldDict[token];
    if (cask1) {
      cask2 = updateCask(cask1, cask2);
    }
    casksOldDict[token] = cask2;
  }

  return [Object.values(casksOldDict), casksOldDict];
};

export const updateIApp = (oldCask: IApp, newCask: IApp): IApp => {
  return {
    ...oldCask,
    ...newCask,
  };
};

export const convertCask2IApp = (cask: IHomebrewApp): IApp => {
  const category = getAppCategory(cask.name[0], cask.desc);
  return {
    id: cask.token,
    title: cask.name[0],
    description: cask.desc,
    categories: [category],
    installed: cask.installed,
    homepage: cask.homepage,
    appSourceType: AppType.Homebrew,
    sourceMetaData: {
      count: cask.count,
      token: cask.token,
      desc: cask.desc,
      homepage: cask.homepage,
      installed: cask.installed,
      name: cask.name,
      url: cask.url,
      version: cask.version,
      outdated: cask.outdated,
    },
  };
};

export const convertCasks2IAppsDict = (casks: IHomebrewApp[]): IAppsDict => {
  const dict: IAppsDict = {};
  for (const cask of casks) {
    dict[cask.token] = convertCask2IApp(cask);
  }
  return dict;
};

export const updateInstallCountsIHomebrew = (
  casks: IHomebrewAppDict,
  popularCasks: IHomebrewTopInstallResponse,
) => {
  const apps = popularCasks['formulae'];
  Object.values(apps).forEach((app) => {
    const token = app[0]['cask'];
    const count = Number(app[0]['count'].replace(',', ''));
    if (casks[token]) {
      casks[token]['count'] = count;
    }
  });

  return casks;
};

export const updateInstallCountsIApp = (
  casks: IAppsDict,
  popularCasks: IHomebrewTopInstallResponse,
) => {
  for (const caskData of Object.values(popularCasks['formulae'])) {
    const token = caskData[0]['cask'];
    const count = caskData[0]['count'];
    if (casks[token] && isHomebrewApp(casks[token])) {
      const metadata = casks[token].sourceMetaData as IHomebrewApp;
      metadata['count'] = parseInt(count);
      casks[token].sourceMetaData = metadata;
    }
  }
  return casks;
};

const isHomebrewApp = (app: IApp) => {
  return app.appSourceType === AppType.Homebrew;
};
