import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LOG_DIR = path.join(os.homedir(), '.brewmate');
const LOG_FILE = path.join(LOG_DIR, 'commands.log');

export function ensureLogDirectory(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function logCommand(
  command: string,
  output?: string,
  exitCode?: number | null,
): void {
  try {
    ensureLogDirectory();

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      command,
      exitCode: exitCode !== undefined && exitCode !== null ? exitCode : null,
      output: output ? output.substring(0, 1000) : null, // Limit output to 1000 chars
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
    console.log('[Logger] Command logged to:', LOG_FILE);
  } catch (error) {
    // Log error but don't break the app
    console.error('[Logger] Failed to log command:', error);
    console.error('[Logger] Log file path:', LOG_FILE);
  }
}

export function getLogFilePath(): string {
  return LOG_FILE;
}
