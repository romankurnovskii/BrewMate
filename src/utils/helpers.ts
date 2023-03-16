import { categories } from '../data/categories';
import { AppType, IApp } from '../types/apps';
import { IHomebrewApp } from '../types/homebrew';

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
