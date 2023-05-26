export const GITHUB_PROJECT_URL = 'https://github.com/romankurnovskii/BrewMate';

// ----------- HOMEBREW_API
const HOMEBREW_API = 'https://formulae.brew.sh/api/';
export const HOMEBREW_FORMULAS_JSON_URL = HOMEBREW_API + 'formula.json';
export const HOMEBREW_CASKS_JSON_URL = HOMEBREW_API + 'cask.json';
export const HOMEBREW_TOP_DOWNLOADS_30D_JSON_URL =
  HOMEBREW_API + 'analytics/cask-install/homebrew-cask/30d.json';
export const HOMEBREW_TOP_DOWNLOADS_90D_JSON_URL =
  HOMEBREW_API + 'analytics/cask-install/homebrew-cask/90d.json';

// ----------- CLI_COMMANDS

export enum BrewCLICommands {
  GET_INSTALLED_CASKS_JSON_OUTPUT = 'brew info --installed --casks --json=v2',
  GET_INSTALLED_FORMULAS_JSON_OUTPUT = 'brew info --installed --formula --json=v2',
  UPDATE = 'brew update',
  UPGRADE = 'brew upgrade',
  UPGRADE_ALL = 'brew update; brew upgrade; brew cu --all --cleanup --force --yes',
  INSTALL_CASK = 'brew install --cask --force',
  UNINSTALL_CASK = 'brew uninstall --cask --force',
  TAPS_ALL_INFO = 'brew tap-info --installed --json',
  TAPS = 'brew search --casks .', // 'brew tap',
  OPEN_LOGS = 'OPEN_LOGS',
}

type BrewCliCommandsNamesType = {
  [key in BrewCLICommands]: string;
};

export const BrewCliCommandsNames: Partial<BrewCliCommandsNamesType> = {
  [BrewCLICommands.UPDATE]: 'brew update',
  [BrewCLICommands.UPGRADE]: 'brew upgrade',
  [BrewCLICommands.UPGRADE_ALL]: 'upgrade all apps',
  [BrewCLICommands.TAPS]: 'repositories',
  [BrewCLICommands.OPEN_LOGS]: 'logs',
};

// ----------- LOCAL_STORAGE

export const TOP_CASKS_INSTALLS_30_DAYS = 'TOP_CASKS_INSTALLS_30_DAYS';
export const TOP_CASKS_INSTALLS_90_DAYS = 'TOP_CASKS_INSTALLS_90_DAYS';
export const BREW_ALL_CASKS_DICT = 'BREW_ALL_CASKS_DICT';
export const BREW_ALL_CASKS_INSTALLED_DICT = 'BREW_ALL_CASKS_INSTALLED_DICT';
export const BREW_ALL_FORMULAS_INSTALLED_DICT =
  'BREW_ALL_FORMULAS_INSTALLED_DICT';

// ----------- OPEN_SOURCE_APPS_GITHUB

export const OSS_APPS_JSON_URL =
  'https://raw.githubusercontent.com/serhii-londar/open-source-mac-os-apps/master/applications.json';
export const OSS_CATEGORIES_JSON_URL =
  'https://raw.githubusercontent.com/serhii-londar/open-source-mac-os-apps/master/categories.json';
