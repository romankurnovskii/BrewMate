import { IHomebrewApp } from './homebrew';

export enum AppType {
  Homebrew = 'Homebrew',
}

export interface IApp {
  id: string;
  title: string;
  description: string;
  categories: any;
  installed: string | null; // version
  homepage: string;
  appSourceType: AppType;
  sourceMetaData?: IHomebrewApp | any;
}
