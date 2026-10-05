import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import it from './locales/it/translation.json';
import en from './locales/en/translation.json';

export const resources = {
  it: { translation: it },
  en: { translation: en },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'it',
    supportedLngs: ['it', 'en'],
    interpolation: { escapeValue: false },
  });

export default i18n;
