import {
  HOMEBREW_CASKS_JSON_URL,
  HOMEBREW_TOP_DOWNLOADS_90D_JSON_URL,
} from '../src/data/constants';
import {
  IHomebrewApp,
  IHomebrewTopInstallResponse,
} from '../src/types/homebrew';

export const fetchCasks = async (): Promise<IHomebrewApp[]> => {
  const response = await fetch(HOMEBREW_CASKS_JSON_URL, { cache: 'no-store' });
  const data = await response.json();
  return data;
};

export const fetchPopularCasks =
  async (): Promise<IHomebrewTopInstallResponse> => {
    const response = await fetch(HOMEBREW_TOP_DOWNLOADS_90D_JSON_URL, {
      cache: 'no-store',
    });
    const data = await response.json();
    return data;
  };

