import { app, ipcRenderer } from 'electron';
import { HOMEBREW_CASKS_JSON_URL } from '../src/data/constants';
import { IHomebrewApp } from '../src/types/homebrew';
import path from 'path';
import { saveJson } from './helpers';

export const fetchHomebrewCasks = async (): Promise<IHomebrewApp[]> => {
  const response = await fetch(HOMEBREW_CASKS_JSON_URL, { cache: 'no-store' });
  const data = await response.json();
  return data;
};
