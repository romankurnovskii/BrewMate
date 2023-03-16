import { IHomebrewApp } from './homebrew';
import { IOpenSourceApp } from './opensource-apps';

export enum AppType {
  Homebrew = 'Homebrew',
  OpenSourceGithub = 'serhii-londar/open-source-mac-os-apps',
}

export interface IApp {
  id: string;
  title: string;
  description: string;
  categories: string[];
  installed: string | null; // version
  homepage: string;
  appSourceType: AppType;
  sourceMetaData: IHomebrewApp | IOpenSourceApp;
}

export type IAppsStorage = {
  [key in AppType]: IApp[];
};
