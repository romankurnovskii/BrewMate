import * as os from 'os';
import { TerminalPromptInfo } from '../types';

export function getTerminalPromptInfo(): TerminalPromptInfo {
  const username = process.env.USER || 'user';
  const hostname = os.hostname().split('.')[0] || 'localhost';
  const cwd = process.env.HOME || process.cwd();
  const dir = cwd.replace(process.env.HOME || '', '~') || '~';

  return { username, hostname, dir };
}
