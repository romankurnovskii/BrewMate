import * as fs from 'fs';

export const LOG_FILE_PATH = 'logsbrewmate.txt';

export const logger = (data: string) => {
  console.log('INFO:', data);
  fs.appendFile(LOG_FILE_PATH, data, (err) => {
    if (err) {
      console.error(`writeFile error: ${err}`);
    }
  });
};
