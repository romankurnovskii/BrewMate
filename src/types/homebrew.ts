export interface IHomebrewApp {
  token: string;
  count?: number; // for installed after transform
  desc: string;
  homepage: string;
  installed: string | null; // version
  name: string[]; // responce is array
  url: string; // .dmg url
  version: string;
  outdated: boolean;
}

export interface IHomebrewTopInstallResponse {
  category: string;
  total_items: number;
  start_date: string;
  end_date: string;
  total_count: number;
  formulae: {
    [key: string]: {
      cask: string;
      count: string;
    };
  }[];
}

export type IHomebrewAppDict = {
  [key: string]: IHomebrewApp;
};
