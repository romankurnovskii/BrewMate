import * as fs from 'fs';
import * as os from 'os';

export const logger = (logfile: string, message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${os.EOL}`;
  fs.appendFile(logfile, logMessage, (err) => {
    if (err) {
      console.error(`writeFile error: ${err.message}`);
    }
  });
};
