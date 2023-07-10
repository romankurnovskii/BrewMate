import { IHomebrewApp } from '../src/types/homebrew';
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
