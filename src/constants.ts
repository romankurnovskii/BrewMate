export const HOMEBREW_FORMULAS_JSON_URL =
  'https://formulae.brew.sh/api/formula.json';
export const HOMEBREW_CASKS_JSON_URL = 'https://formulae.brew.sh/api/cask.json';

export const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const CATEGORIES = [
  'All',
  'Installed',
  'Business',
  'Photo/Video',
  'Graphic/Design',
  'Social',
  'Menubar',
  'Developer Tools',
  'Wallets/Crypto',
  'Productivity',
  'Music',
  'Education',
  'Reference',
  'Games',
  'Health/Fitness',
  'News',
  'Utilities',
  'Other',
];

export const VIRTUAL_SCROLL_CONFIG = {
  rowHeight: 220,
  bufferRows: 5,
  debounceMs: 300,
  scrollThrottleMs: 50,
  scrollThreshold: 50,
};
