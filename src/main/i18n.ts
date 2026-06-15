import i18n from 'i18next';
import path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

const isDev = !app.isPackaged;

// Load translations from files
const loadTranslations = (lng: string) => {
  try {
    const localePath = path.join(app.getAppPath(), `locales/${lng}.json`);
    const data = fs.readFileSync(localePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to load translations for ${lng}:`, error);
    return {};
  }
};

export const initI18n = () => {
  // Load all available languages
  const enTranslations = loadTranslations('en');
  const esTranslations = loadTranslations('es');
  const ruTranslations = loadTranslations('ru');
  const ukTranslations = loadTranslations('uk');
  const hiTranslations = loadTranslations('hi');

  i18n
    .init({
      resources: {
        en: { translation: enTranslations },
        es: { translation: esTranslations },
        ru: { translation: ruTranslations },
        uk: { translation: ukTranslations },
        hi: { translation: hiTranslations },
      },
      lng: 'en', // Default language
      fallbackLng: 'en',
      debug: isDev,
      interpolation: {
        escapeValue: false,
      },
    });

  return i18n;
};

export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
};

export const t = (key: string, options?: any) => {
  return i18n.t(key, options);
};

export const getCurrentLanguage = () => {
  return i18n.language;
};
