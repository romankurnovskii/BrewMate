import { IHomebrewApp } from './homebrew';

export enum AppType {
  Homebrew = 'Homebrew',
}

export interface IApp {
  id: string;
  title: string;
  description: string;
  installed: string | null; // version
  homepage: string;
  appSourceType: AppType;
  sourceMetaData: IHomebrewApp;
}
