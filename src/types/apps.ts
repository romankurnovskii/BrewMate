import { IHomebrewApp } from './homebrew';
import { ISerhiiLondarOSMACApp } from './serhii-londar';

export enum AppType {
  Homebrew = 'Homebrew',
  SerhiiLondarOSMAC = 'serhii-londar/open-source-mac-os-apps',
}

export interface IApp {
  id: string;
  title: string;
  description: string;
  categories: any;
  installed: string | null; // version
  homepage: string;
  appSourceType: AppType;
  sourceMetaData: IHomebrewApp | ISerhiiLondarOSMACApp;
}
