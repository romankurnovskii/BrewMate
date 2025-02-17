import * as path from 'path';
import { app } from 'electron';

export const LOG_FILE_PATH = path.join(
  app.getPath('userData'),
  'logsbrewmate.txt',
);
export const CASKS_FILE_PATH = path.join(app.getPath('userData'), 'casks.json');
export const CASKS_DICT_FILE_PATH = path.join(
  app.getPath('userData'),
  'casks-dict.json',
);

export const THIRD_PARTY_CASKS_URL =
  'https://raw.githubusercontent.com/romankurnovskii/homebrew-awesome-brew/main/casks.json';
