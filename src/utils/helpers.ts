import { categories } from '../data/categories';
import { IApp } from '../types/apps';
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

export const getAppCategory = (name: string, description: string): string => {
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

export const sortAppsByInstalled = (apps: IApp[]): IApp[] => {
  const sortedApps = apps.sort((a, b) => {
    let countA = 0;
    let countB = 0;
    const appDataA = a.sourceMetaData as IHomebrewApp;
    const appDataB = b.sourceMetaData as IHomebrewApp;
    if (appDataA.count) {
      countA = appDataA.count;
    }
    if (appDataB.count) {
      countB = appDataB.count;
    }
    return countB - countA;
  });
  return sortedApps;
};
