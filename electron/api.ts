import {
  HOMEBREW_CASKS_JSON_URL,
  HOMEBREW_TOP_DOWNLOADS_90D_JSON_URL,
} from '../src/data/constants';
import {
  IHomebrewApp,
  IHomebrewTopInstallResponse,
} from '../src/types/homebrew';
import { THIRD_PARTY_CASKS_URL } from './constants';

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

export const fetch3rdPartyCasksMeta = async (): Promise<any> => {
  const response = await fetch(THIRD_PARTY_CASKS_URL);
  const data = await response.json();
  return data;
};
