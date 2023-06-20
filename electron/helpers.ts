import { IHomebrewApp } from './../src/types/homebrew';
import * as fs from 'fs';
import * as os from 'os';

export const logger = (logfile: string, message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${os.EOL}`;
  fs.appendFile(logfile, logMessage, (err) => {
    if (err) {
      console.error(`writeFile error: ${err.message}`);
    }
  });
};

export const saveJson = (filename: string, data: any) => {
  fs.writeFile(filename, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error(`writeFile error: ${err.message}`);
    }
  });
};

export const loadJson = (filename: string) => {
  return JSON.parse(fs.readFileSync(filename).toString());
};

export const convertCasksArrayToDict = (
  casksArray: IHomebrewApp[],
): Record<string, IHomebrewApp> => {
  const casksDict: Record<string, IHomebrewApp> = {};
  for (const cask of casksArray) {
    casksDict[cask.token] = {
      token: cask.token,
      desc: cask.desc,
      homepage: cask.homepage,
      version: cask.version,
      installed: cask.installed,
      name: cask.name,
      url: cask.url,
      outdated: cask.outdated,
    };
  }
  return casksDict;
};

// MERGE ALL CASKS
// export const mergeAllCasks = async (localDbCasks?: IAppsDict) => {
//   if (localDbCasks) {
//     console.log(localDbCasks);
//   }
//   const casks: IHomebrewApp[] = await fetchCasks();
//   const allCaskNames = await HomebrewCLI.getAllCaskNames();
//   const [installedCasks, formulas] =
//     await HomebrewCLI.getInstalledCasksJsonOutput();

//   const allCasksUpdated = updateInstalledStatusApps(casks, installedCasks);

//   const casksDict = convertCasksArrayToDict(allCasksUpdated);

//   const allCasks: IAppsDict = {};

//   for (const caskName of allCaskNames) {
//     let cask: IHomebrewApp = casksDict[caskName];

//     if (!cask) {
//       if (caskName.startsWith('font-')) {
//         continue;
//       }
//       cask = getCaskInfoTemplate(caskName);
//     }

//     const converted = convertCask2IApp(cask);
//     allCasks[caskName] = converted;
//   }

//   // TODO handle in another place
//   // const promises = allCaskNames.map(async (caskName) => {
//   //   let cask: IHomebrewApp = casksDict[caskName];

//   //   if (!cask) {
//   //     cask = await getCaskInfo(caskName);
//   //   }

//   //   const converted = convertCask2IApp(cask);
//   //   allCasks[caskName] = converted;
//   // });

//   // await Promise.all(promises);

//   return allCasks;
// };

export const updateInstalledStatusApps = (
  allApps: IHomebrewApp[],
  installedApps: IHomebrewApp[],
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

  return updatedApps;
};

// TODO duplicate in src/helpers
type ObjectWithKeyName = {
  [key: string]: any;
};
// transform array of objects to dict
// use object provided keyName as a key of dict
// expected for each object in array this keyName value is unique
export const transformArrayToDict = (
  objects: ObjectWithKeyName[],
  keyName: string,
) => {
  const res: ObjectWithKeyName = {};
  objects.forEach((obj) => {
    res[obj[keyName]] = obj;
  });
  return res;
};
